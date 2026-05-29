"""
Build a sample "news feed" of real articles for the Summary section's rolling
overview. We don't have clean headlines, but GDELT's DocumentIdentifier (the
article URL) usually carries a readable slug we can turn into a rough headline,
plus we already have each article's date, source, country and tone.

Output (export.export_articles → <slug>-articles.json):
    [ { title, source, iso, date, tone }, ... ]   # chronological
"""
import re
import urllib.parse

import polars as pl

from src.transform import _domain_to_country

_EXT_RE = re.compile(r"\.(html?|php|aspx?|shtml|jsp)$", re.I)
_HEX_ID = re.compile(r"^[0-9a-f]{8,}$", re.I)
_HAS_ALPHA = re.compile(r"[A-Za-zÀ-ÿ]")


def _is_word(tok: str) -> bool:
    if not tok:
        return False
    if tok.isdigit():
        return len(tok) <= 4          # keep "44", "2024"; drop long numeric ids
    if _HEX_ID.match(tok):
        return False                  # drop hash/uuid-ish segments
    return bool(_HAS_ALPHA.search(tok))


def _title_from_url(url: str) -> str | None:
    """Derive a readable headline from a URL's last path segment, or None."""
    if not url:
        return None
    try:
        path = urllib.parse.urlparse(url).path
    except Exception:
        return None
    seg = path.rstrip("/").split("/")[-1]
    seg = _EXT_RE.sub("", seg)
    seg = urllib.parse.unquote(seg).replace("_", "-").replace(".", "-")
    tokens = [t for t in seg.split("-") if t]
    words = [t for t in tokens if _is_word(t)]
    alpha_words = [w for w in words if _HAS_ALPHA.search(w)]
    if len(alpha_words) < 4:
        return None
    title = " ".join(words).strip()
    if not (14 <= len(title) <= 90):
        return None
    return title.title()


def extract_articles(df: pl.DataFrame, final: int = 320, pool: int = 80000) -> list[dict]:
    print("Extracting article feed (from DocumentIdentifier slugs)...")
    if "DocumentIdentifier" not in df.columns:
        print("  WARNING: no DocumentIdentifier column. Skipping articles.")
        return []

    df = df.with_columns([
        pl.col("DATE").cast(pl.Utf8).str.slice(0, 8).str.to_date("%Y%m%d").alias("date"),
        pl.col("V2Tone").str.split(",").list.first().cast(pl.Float64, strict=False).alias("tone"),
    ]).drop_nulls(["DocumentIdentifier", "date"]).unique(subset=["DocumentIdentifier"])

    # Sample a pool, then derive titles on that (Python) — fast on the small pool.
    if len(df) > pool:
        df = df.sample(pool, seed=7)

    domain_iso = {
        d: c
        for d in df["SourceCommonName"].drop_nulls().unique().to_list()
        if (c := _domain_to_country(d)) is not None
    }

    rows: list[dict] = []
    for r in df.iter_rows(named=True):
        title = _title_from_url(r["DocumentIdentifier"])
        if not title:
            continue
        tone = r["tone"]
        rows.append({
            "title": title,
            "source": (r["SourceCommonName"] or "").lower(),
            "iso": domain_iso.get(r["SourceCommonName"]),
            "date": r["date"].isoformat(),
            "tone": round(float(tone), 2) if tone is not None else None,
        })

    rows.sort(key=lambda x: x["date"])
    # Evenly spaced across time so the feed spans the whole period.
    if len(rows) > final:
        step = len(rows) / final
        rows = [rows[int(i * step)] for i in range(final)]

    print(f"  Articles kept: {len(rows)} (with readable slugs)")
    return rows
