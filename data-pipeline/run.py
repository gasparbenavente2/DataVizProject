"""
Usage:
  python run.py --topic "ukraine-war" --keywords "ukraine,russia,kyiv,zelensky,putin" \
                --start 2022-02 --end 2022-03 --credentials path/to/creds.json

  # Preview query cost before running:
  python run.py ... --dry-run
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.config import GCP_PROJECT_ID, OUTPUT_DIR
from src.fetch import fetch
from src.transform import transform
from src.topics import aggregate_topics
from src.articles import extract_articles
from src.export import export, export_topics, export_articles


def main():
    parser = argparse.ArgumentParser(description="GDELT sentiment pipeline")
    parser.add_argument("--topic",       required=True,
                        help='Short label for the topic, used in output filename. e.g. "ukraine-war"')
    parser.add_argument("--keywords",    required=True,
                        help='Comma-separated search terms. e.g. "ukraine,russia,kyiv,zelensky,putin"')
    parser.add_argument("--start",       required=True,  help="Start month: YYYY-MM")
    parser.add_argument("--end",         required=True,  help="End month:   YYYY-MM")
    parser.add_argument("--credentials", required=True,  help="Path to GCP service account JSON")
    parser.add_argument("--dry-run",     action="store_true",
                        help="Preview query cost without running it")
    args = parser.parse_args()

    keywords = [kw.strip() for kw in args.keywords.split(",") if kw.strip()]

    if args.dry_run:
        fetch(args.topic, keywords, args.start, args.end, args.credentials, GCP_PROJECT_ID, dry_run=True)
        return

    raw  = fetch(args.topic, keywords, args.start, args.end, args.credentials, GCP_PROJECT_ID)
    if raw is None:
        return
    agg  = transform(raw)
    path = export(agg, args.topic, args.start, args.end, OUTPUT_DIR)

    topics = aggregate_topics(raw, keywords)
    topics_path = export_topics(topics, args.topic, OUTPUT_DIR)

    articles = extract_articles(raw)
    articles_path = export_articles(articles, args.topic, OUTPUT_DIR)

    print(f"\nDone.")
    print(f"  Sentiment: {path}")
    print(f"  Topics:    {topics_path}")
    print(f"  Articles:  {articles_path}")


if __name__ == "__main__":
    main()
