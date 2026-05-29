import calendar
import re
from pathlib import Path

import polars as pl
from google.cloud import bigquery
from google.oauth2 import service_account

_CACHE_DIR = Path(__file__).parents[1] / "output" / "cache"
# Bump when the SELECT columns change so stale caches (missing new columns) are ignored.
_CACHE_VERSION = "v3"


def _cache_path(topic: str, keywords: list[str], date_start: str, date_end: str) -> Path:
    slug = re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")
    kw_slug = "-".join(sorted(kw.lower() for kw in keywords))[:60]
    return _CACHE_DIR / f"{slug}__{kw_slug}__{date_start}__{date_end}__{_CACHE_VERSION}.parquet"


def fetch(
    topic: str,
    keywords: list[str],
    date_start: str,        # "YYYY-MM"
    date_end: str,          # "YYYY-MM"
    credentials_path: str,
    project_id: str,
    dry_run: bool = False,
) -> pl.DataFrame | None:
    """Query GDELT GKG on BigQuery and return a raw Polars DataFrame.
    Results are cached — re-running with the same parameters skips BigQuery.
    """
    start = date_start + "-01"
    year, month = date_end.split("-")
    last_day = calendar.monthrange(int(year), int(month))[1]
    end = f"{year}-{month}-{last_day:02d}"

    start_int = int(start.replace("-", "") + "000000")
    end_int   = int(end.replace("-", "")   + "235959")

    # Each keyword must match (AND across keywords).
    # Within a keyword, Themes, V2Persons, or the URL can match (OR).
    # Multi-word keywords use [- ] in URL regex to handle hyphenated slugs (e.g. elon-musk).
    per_kw = []
    for kw in keywords:
        kw = kw.lower().strip()
        url_kw = kw.replace(" ", "[- ]")
        per_kw.append(
            f"(REGEXP_CONTAINS(LOWER(COALESCE(Themes, '')), r'\\b{kw}\\b')"
            f" OR REGEXP_CONTAINS(LOWER(COALESCE(V2Persons, '')), r'\\b{kw}\\b')"
            f" OR REGEXP_CONTAINS(LOWER(COALESCE(DocumentIdentifier, '')), r'{url_kw}'))"
        )
    keyword_filter = "\n    AND ".join(per_kw)

    sql = f"""
    SELECT
        DATE,
        SourceCommonName,
        DocumentIdentifier,
        V2Tone,
        V2Organizations,
        V2Themes
    FROM `gdelt-bq.gdeltv2.gkg_partitioned`
    WHERE
        _PARTITIONDATE BETWEEN DATE '{start}' AND DATE '{end}'
        AND DATE BETWEEN {start_int} AND {end_int}
        AND (
            {keyword_filter}
        )
    """

    creds = service_account.Credentials.from_service_account_file(credentials_path)
    client = bigquery.Client(project=project_id, credentials=creds)

    if dry_run:
        job_config = bigquery.QueryJobConfig(dry_run=True, use_query_cache=False)
        job = client.query(sql, job_config=job_config)
        gb = job.total_bytes_processed / 1e9
        print(f"\n--- DRY RUN ---")
        print(f"  Query would process: {gb:.2f} GB")
        print(f"  Free tier limit:     1 TB/month")
        print(f"\n--- SQL ---\n{sql}")
        return None

    # Check cache
    cache = _cache_path(topic, keywords, date_start, date_end)
    if cache.exists():
        print(f"Loading from cache: {cache.name}")
        return pl.read_parquet(cache)

    print(f"Querying BigQuery for '{topic}' ({start} → {end})...")
    print(f"  Keywords: {keywords}")
    rows = client.query(sql).to_dataframe()
    df = pl.from_pandas(rows)
    print(f"  Fetched {len(df):,} rows.")

    if len(df) == 0:
        print("  WARNING: 0 rows returned — check your keywords. Not caching empty result.")
        return df

    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    df.write_parquet(cache)
    print(f"  Cached → {cache.name}")

    return df
