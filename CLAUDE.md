# Perspectiva — News Sentiment Globe

Interactive world map showing how a news event spreads across countries over time and how each country's media feels about it, using GDELT data.

## Visualization Concept
- User picks a topic (e.g. "Elon Musk", "Brexit")
- Map shows, day by day, how coverage spreads to different countries
- Color = sentiment (positive/negative tone) of that country's media about the topic
- Timeline has event markers at key moments that shift perception
- The unit of analysis is: **how does country X's media feel about topic Y on day Z**

## Stack
- **App**: Next.js (App Router) + TypeScript + Tailwind + MapLibre GL + react-map-gl
- **Data layer**: DuckDB (Node.js) reading parquet files via API routes
- **Pipeline**: Python + Google BigQuery (GDELT source)
- **Deployment**: Run locally with `npm run dev` (parquet files required in `app/public/data/`)

## Folder Structure
```
dataviz-project/
├── app/                         # Next.js web app
│   ├── public/data/             # Parquet files served to the app (NOT in git — copy manually)
│   └── src/
│       ├── app/
│       │   └── api/sentiment/         # /sentiment, /dates, /timeline, /era-countries, /country-timeline
│       ├── components/
│       ├── lib/
│       │   └── queries.ts       # hyparquet reads, all data access functions
│       └── types/
└── data-pipeline/               # Python pipeline (BigQuery → parquet)
    ├── src/
    │   ├── config.py            # GCP project ID, output dir
    │   ├── fetch.py             # BigQuery query + raw data cache
    │   ├── transform.py         # Source country mapping, daily aggregation
    │   ├── export.py            # Write parquet to output/
    │   └── domains.py           # TLD + domain → ISO3 country mapping
    ├── output/                  # Pipeline staging area (gitignored)
    │   └── cache/               # Raw BigQuery results cache (gitignored)
    ├── eda.py                   # Quick EDA charts for any output parquet
    ├── run.py                   # CLI entry point
    └── requirements.txt
```

## Data Flow
```
GDELT (BigQuery)
    ↓ data-pipeline/src/fetch.py        — keywords + date range query, cached locally
    ↓ data-pipeline/src/transform.py    — source country via domain mapping, daily aggregation
    ↓ data-pipeline/output/             — staging parquet (gitignored)
    ↓ cp output/<topic>.parquet app/public/data/   — manual copy step
    ↓ app/src/lib/db.ts                 — DuckDB reads parquet at runtime
    ↓ app/src/app/api/sentiment/        — API routes serve per-date data
    ↓ React hooks → Map component
```

## Parquet Schema
| Column | Type | Description |
|---|---|---|
| `date` | Date | Day (e.g. 2022-02-24) |
| `country_iso3` | String | ISO 3166-1 alpha-3 (e.g. GBR, DEU, UKR) |
| `avg_tone` | Float64 | Mean sentiment that day. Negative = negative coverage |
| `article_count` | UInt32 | Unique articles from that country |

## Getting Started

**App (local dev with real data):**
```bash
cd app && npm install && npm run dev
# Open http://localhost:3000
```
> API routes require the parquet files to be present in `app/public/data/`.
> They are not in git — copy them manually (see below).

**Copy parquet files after running the pipeline:**
```bash
cp data-pipeline/output/<topic>.parquet app/public/data/
```

**Pipeline:**
```bash
cd data-pipeline
source .venv/bin/activate

# Check query cost first
python run.py --topic "elon-musk" --keywords "elon musk" \
              --start 2015-01 --end 2026-05 \
              --credentials dataviz-490213-eb4214bb9d4b.json --dry-run

# Run for real
python run.py --topic "elon-musk" --keywords "elon musk" \
              --start 2015-01 --end 2026-05 \
              --credentials dataviz-490213-eb4214bb9d4b.json

# Copy to app when ready
cp output/elon-musk-2015-01-2026-05.parquet ../app/public/data/
```

**EDA on any parquet:**
```bash
cd data-pipeline && source .venv/bin/activate
python eda.py output/elon-musk-2015-01-2026-05.parquet
```

## Adding a New Topic
1. Run the pipeline to generate a parquet in `data-pipeline/output/`
2. Copy the parquet to `app/public/data/`
3. Add one entry to the `TOPICS` array in `app/src/app/page.tsx`

## Active Topic
| File | Date range | Keywords |
|---|---|---|
| `elon-musk-2015-01-2026-05.parquet` | Jan 2015 – May 2026 | elon musk |

## Course
EPFL COM-480 Data Visualization — Milestone 3 due 2026-05-29
