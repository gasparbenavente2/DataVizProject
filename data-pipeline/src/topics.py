"""
Aggregate GDELT topic signals into per-era and per-country lists that power the
word clouds and the "most used word per country" chart in the app.

Two complementary signals are extracted per article:
  * organizations  (V2Organizations) — concrete entities: Tesla, SpaceX, SEC, NASA…
  * concepts       (V2Themes)        — abstract topics from GDELT's theme taxonomy,
                                       cleaned into readable labels (Protest, Layoffs…)

Locations and people are intentionally *not* used — they dominate AllNames with
geography ("United States", "New York") and add little about *what* the coverage is.

Output (written as JSON by export.export_topics):

    {
      "eras": ["2015 – 2018", ...],            # index = era id
      "global": {
        "all": { "orgs": [{name,count}...], "themes": [{name,count}...] },
        "0":   { "orgs": [...], "themes": [...] },
        ...
      },
      "byCountry": { "USA": { "all": {...}, "0": {...}, ... }, ... }
    }

`count` = number of distinct articles mentioning that org / concept in the bucket.
"""
import re
from datetime import date

import polars as pl

from src.transform import _domain_to_country

# Elon-Musk era cut points (must match ERA_BOUNDARIES in the app).
ERA_BOUNDARIES = [
    date(2015, 1, 1),
    date(2018, 1, 1),
    date(2020, 1, 1),
    date(2022, 1, 1),
    date(2023, 1, 1),
    date(2027, 1, 1),
]
ERA_LABELS = ["2015 – 2018", "2018 – 2020", "2020 – 2022", "2022 – 2023", "2023 – 2026"]

TOP_N = 30                 # items kept per (bucket, signal)
MIN_COUNTRY_ARTICLES = 50  # drop tiny countries to keep the JSON small & meaningful

# ── Organization filtering ──────────────────────────────────────────────
# News outlets / agencies are reporters, not the subject — drop them.
_ORG_STOP = {
    "reuters", "associated press", "bloomberg", "getty images", "cnn", "bbc",
    "new york times", "the new york times", "washington post", "the guardian",
    "fox news", "cnbc", "afp", "agence france presse", "the times", "financial times",
    "wall street journal", "the wall street journal", "usa today", "npr", "axios",
    "politico", "business insider", "the verge", "techcrunch", "forbes",
    # Geography / generic government bodies that GDELT tags as organizations.
    "united states", "u.s.", "us", "white house", "congress", "senate",
    "house of representatives", "united nations",
}

# ── Theme cleaning ──────────────────────────────────────────────────────
# GDELT V2Themes are coded (e.g. "ECON_STOCKMARKET", "TAX_FNCACT_CEO", "WB_678_...").
# Whole-theme families that are too technical / generic to show in a cloud.
# Whole theme families that are too technical, too generic, or not discriminative.
# TAX_ is dropped wholesale (taxonomy buckets: functional-actor roles like CEO/President,
# diseases, languages, ethnicities, generic econ-price categories — all noise here).
_THEME_DROP_PREFIXES = (
    "WB_", "CRISISLEX_", "UNGP_", "EPU_", "USPEC_", "TAX_", "MEDIA_", "GEN_",
    "WORLDLANGUAGES", "SOC_POINTSOFINTEREST",
)
# Generic concepts that appear in nearly all news and say nothing topic-specific.
_THEME_STOP_LABELS = {
    "leader", "general government", "affect", "armedconflict", "act force",
    "social media", "media", "usa", "uk", "national government", "implied",
    "education", "general health", "medical", "women", "men", "employees",
    "health", "science", "death", "wound", "manmade disaster", "general",
    "crisislex crisislexrec", "epu policy", "world", "natural disaster",
    "soc generalcrime", "general crime", "checkpoint", "movement general",
    "manmade disaster implied", "services", "general services",
}


# Readability: strip a leading category prefix ("ECON_STOCKMARKET" → "Stockmarket").
_THEME_READ_PREFIXES = ("ECON_", "SOC_", "SECURITY_", "POLITICAL_", "ENV_")
_DROP_RE = "^(" + "|".join(re.escape(p) for p in _THEME_DROP_PREFIXES) + ")"
_READ_RE = "^(" + "|".join(re.escape(p) for p in _THEME_READ_PREFIXES) + ")"


def _clean_themes(frame: pl.DataFrame) -> pl.DataFrame:
    """Vectorized theme cleaning over the exploded `raw` column. Adds `name` + `key`.

    Equivalent to applying the per-code rules below, but as native polars string
    ops so it runs over 100M+ rows in seconds instead of row-wise Python.
      - drop technical/generic theme families (TAX_, WB_, EPU_, …) and any code with digits
      - strip a leading category prefix for readability
      - "_" → space, Title Case
      - drop labels that are too short / too long / in the generic stoplist
    """
    return (
        frame.filter(~pl.col("raw").str.contains(_DROP_RE))
        .filter(~pl.col("raw").str.contains(r"\d"))
        .with_columns(
            pl.col("raw")
            .str.replace(_READ_RE, "")
            .str.replace_all("_", " ")
            .str.strip_chars()
            .str.to_titlecase()
            .alias("name")
        )
        .filter(pl.col("name").str.len_chars() >= 3)
        .filter(pl.col("name").str.split(" ").list.len() <= 4)
        .with_columns(pl.col("name").str.to_lowercase().alias("key"))
        .filter(~pl.col("key").is_in(list(_THEME_STOP_LABELS)))
    )


def _era_expr() -> pl.Expr:
    b = ERA_BOUNDARIES
    return (
        pl.when(pl.col("date") < b[1]).then(0)
        .when(pl.col("date") < b[2]).then(1)
        .when(pl.col("date") < b[3]).then(2)
        .when(pl.col("date") < b[4]).then(3)
        .otherwise(4)
        .alias("era")
    )


def _org_stop(keywords: list[str]) -> set[str]:
    stop = set(_ORG_STOP)
    for kw in keywords:
        kw = kw.lower().strip()
        stop.add(kw)
        stop.update(kw.split())
    return stop


def _collect_streaming(lf: pl.LazyFrame) -> pl.DataFrame:
    """Collect a LazyFrame with the streaming engine (bounded memory), across polars versions."""
    try:
        return lf.collect(engine="streaming")
    except TypeError:
        return lf.collect(streaming=True)


def _agg_signal(df: pl.DataFrame, col: str, clean) -> pl.DataFrame:
    """Explode a `name,offset;…` column and aggregate to mention counts at the finest grain.

    Returns a small DataFrame [country_iso3, era, key, name, count]. The 100M-row
    explode is done lazily + streaming, so only the grouped result lands in memory.
    `clean` takes the lazy frame (with a `raw` column) and returns it with `name`+`key`.
    """
    lf = (
        df.lazy()
        .select(["era", "country_iso3", col])
        .drop_nulls(col)
        .with_columns(pl.col(col).str.split(";"))
        .explode(col)
        .with_columns(pl.col(col).str.split(",").list.first().str.strip_chars().alias("raw"))
        .filter(pl.col("raw").str.len_chars() >= 1)
    )
    lf = clean(lf)
    agg = lf.group_by(["country_iso3", "era", "key"]).agg([
        pl.len().alias("count"),
        pl.col("name").first().alias("name"),
    ])
    return _collect_streaming(agg)


def _topn(frame: pl.DataFrame, group_cols: list[str]) -> pl.DataFrame:
    """Roll up the fine-grained counts to top-N per group (operates on the small frame)."""
    g = (
        frame.group_by(group_cols + ["key"])
        .agg([pl.col("count").sum().alias("count"), pl.col("name").first().alias("name")])
        .sort("count", descending=True)
    )
    if group_cols:
        g = g.group_by(group_cols, maintain_order=True).head(TOP_N)
    else:
        g = g.head(TOP_N)
    return g


def _rows_to_list(frame: pl.DataFrame) -> list[dict]:
    return [
        {"name": r["name"], "count": int(r["count"])}
        for r in frame.sort("count", descending=True).iter_rows(named=True)
    ]


def _blocks_from(agg: pl.DataFrame, signal: str, big: list[str], out_global: dict, out_country: dict):
    """Populate global + per-country era buckets for one signal ('orgs' or 'themes')."""
    eras = [str(i) for i in range(len(ERA_LABELS))]

    # global
    g_all = _topn(agg, [])
    g_era = _topn(agg, ["era"])
    out_global["all"][signal] = _rows_to_list(g_all)
    for e in range(len(ERA_LABELS)):
        out_global[str(e)][signal] = _rows_to_list(g_era.filter(pl.col("era") == e))

    # per country (only the kept countries)
    cn = agg.filter(pl.col("country_iso3").is_in(big))
    c_all = _topn(cn, ["country_iso3"])
    c_era = _topn(cn, ["country_iso3", "era"])
    for iso in big:
        out_country[iso]["all"][signal] = _rows_to_list(c_all.filter(pl.col("country_iso3") == iso))
        sub = c_era.filter(pl.col("country_iso3") == iso)
        for e in range(len(ERA_LABELS)):
            out_country[iso][str(e)][signal] = _rows_to_list(sub.filter(pl.col("era") == e))


def aggregate_topics(df: pl.DataFrame, keywords: list[str]) -> dict:
    print("Aggregating topics (V2Organizations + V2Themes)...")
    have_org = "V2Organizations" in df.columns
    have_theme = "V2Themes" in df.columns
    if not (have_org or have_theme):
        print("  WARNING: no V2Organizations/V2Themes columns — re-fetch with the updated query. Skipping topics.")
        return {"eras": ERA_LABELS, "global": {}, "byCountry": {}}

    org_stop = _org_stop(keywords)

    df = df.with_columns(
        pl.col("DATE").cast(pl.Utf8).str.slice(0, 8).str.to_date("%Y%m%d").alias("date")
    ).with_columns(_era_expr())

    domain_map = {
        d: c
        for d in df["SourceCommonName"].drop_nulls().unique().to_list()
        if (c := _domain_to_country(d)) is not None
    }
    df = df.with_columns(pl.col("SourceCommonName").replace(domain_map).alias("country_iso3"))

    def clean_orgs(lf: pl.LazyFrame) -> pl.LazyFrame:
        return lf.with_columns([
            pl.col("raw").alias("name"),
            pl.col("raw").str.to_lowercase().alias("key"),
        ]).filter((pl.col("key").str.len_chars() >= 2) & (~pl.col("key").is_in(list(org_stop))))

    org_agg = _agg_signal(df, "V2Organizations", clean_orgs) if have_org else None
    theme_agg = _agg_signal(df, "V2Themes", _clean_themes) if have_theme else None

    # Countries kept: enough total mentions, valid ISO3.
    ref = org_agg if org_agg is not None else theme_agg
    big = (
        ref.filter(
            pl.col("country_iso3").is_not_null() & (pl.col("country_iso3").str.len_chars() == 3)
        )
        .group_by("country_iso3")
        .agg(pl.col("count").sum().alias("n"))
        .filter(pl.col("n") >= MIN_COUNTRY_ARTICLES)["country_iso3"]
        .to_list()
    )

    bucket_keys = ["all"] + [str(i) for i in range(len(ERA_LABELS))]
    global_block: dict[str, dict] = {k: {} for k in bucket_keys}
    by_country: dict[str, dict] = {iso: {k: {} for k in bucket_keys} for iso in big}

    if org_agg is not None:
        _blocks_from(org_agg, "orgs", big, global_block, by_country)
    if theme_agg is not None:
        _blocks_from(theme_agg, "themes", big, global_block, by_country)

    n_orgs = len(global_block["all"].get("orgs", []))
    n_themes = len(global_block["all"].get("themes", []))
    print(f"  Global orgs   : {n_orgs} | concepts: {n_themes}")
    print(f"  Countries     : {len(by_country)} (≥ {MIN_COUNTRY_ARTICLES} mentions)")

    return {"eras": ERA_LABELS, "global": global_block, "byCountry": by_country}
