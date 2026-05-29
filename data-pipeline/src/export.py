import json
import re
from pathlib import Path

import polars as pl


def export(df: pl.DataFrame, topic: str, date_start: str, date_end: str, output_dir: Path) -> Path:
    """Write the aggregated DataFrame to a Parquet file. Returns the output path."""
    output_dir.mkdir(parents=True, exist_ok=True)

    slug = re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")
    filename = f"{slug}-{date_start}-{date_end}.parquet"
    path = output_dir / filename

    df.write_parquet(path, compression="snappy")
    print(f"Saved → {path}  ({path.stat().st_size / 1024:.1f} KB)")

    return path


def export_topics(topics: dict, topic: str, output_dir: Path) -> Path:
    """Write the aggregated topic dict to a JSON file. Returns the output path."""
    output_dir.mkdir(parents=True, exist_ok=True)

    slug = re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")
    path = output_dir / f"{slug}-topics.json"

    with path.open("w", encoding="utf-8") as f:
        json.dump(topics, f, ensure_ascii=False)
    print(f"Saved → {path}  ({path.stat().st_size / 1024:.1f} KB)")

    return path


def export_articles(articles: list, topic: str, output_dir: Path) -> Path:
    """Write the sampled article feed to a JSON file. Returns the output path."""
    output_dir.mkdir(parents=True, exist_ok=True)

    slug = re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")
    path = output_dir / f"{slug}-articles.json"

    with path.open("w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False)
    print(f"Saved → {path}  ({path.stat().st_size / 1024:.1f} KB)")

    return path
