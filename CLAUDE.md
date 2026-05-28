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
- **Deployment**: GitHub Pages (static export via `STATIC_EXPORT=true`)

## Folder Structure
```
dataviz-project/
├── app/                         # Next.js web app
│   ├── public/data/             # Parquet files served to the app (NOT in git — copy manually)
│   └── src/
│       ├── app/
│       │   ├── api/sentiment/         # GET /api/sentiment?date=&file=
│       │   └── api/sentiment/dates/   # GET /api/sentiment/dates?file=
│       ├── components/
│       ├── lib/
│       │   ├── db.ts            # DuckDB connection
│       │   └── queries.ts       # SQL queries against parquet
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
python run.py --topic "brexit" --keywords "brexit" \
              --start 2015-01 --end 2026-05 \
              --credentials dataviz-490213-eb4214bb9d4b.json --dry-run

# Run for real
python run.py --topic "brexit" --keywords "brexit" \
              --start 2015-01 --end 2026-05 \
              --credentials dataviz-490213-eb4214bb9d4b.json

# Copy to app when ready
cp output/brexit-2015-01-2026-05.parquet ../app/public/data/
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

## Available Topics (parquets produced so far)
| File | Date range | Keywords |
|---|---|---|
| `sputnik-vaccine-covid-2020-08-2021-08.parquet` | Aug 2020 – Aug 2021 | sputnik vaccine |
| `ukraine-war-2022-02-2022-03.parquet` | Feb–Mar 2022 | ukraine, russia, kyiv, zelensky, putin |
| `elon-musk-2015-01-2026-05.parquet` | Jan 2015 – May 2026 | elon musk |
| `brexit-2015-01-2026-05.parquet` | Jan 2015 – May 2026 | brexit |

## Deployment (GitHub Pages)
Push to `main` — GitHub Actions builds with `STATIC_EXPORT=true` and deploys automatically.
The static build uses mock/no data; real data requires running the app locally with parquet files.

## Course
EPFL COM-480 Data Visualization — Milestone 3 due 2026-05-29

---

## Task: Implement Charts in SectionEvents.tsx

> **Status**: Not yet implemented. This section gives you everything you need to build the two chart placeholders in `app/src/components/SectionEvents.tsx`.

### What to build

There are two placeholder areas currently showing grey labels:

**1. Overview slide chart** (`app/src/components/SectionEvents.tsx`, Slide 0)
- Location: the `<div className="flex-1 relative overflow-hidden">` block that contains the "sentiment timeline chart" label (around line 181)
- Replace the inner placeholder with a full-width Recharts `ComposedChart`:
  - `Area` for total `article_count` per day (volume — fills bottom, muted color `rgba(118,131,166,0.15)`)
  - `Line` for global `avg_tone` per day (the main signal — white or gradient-colored)
  - `ReferenceArea` per era band using the `eraProportions` array already computed in the component (these map directly to x-domain positions — use the date strings as x values)
  - `ReferenceLine` at y=0 (the neutral baseline)
  - Keep era band background divs that already exist behind the chart; the Recharts chart goes on top with `background="transparent"`
  - Wrap in `<ResponsiveContainer width="100%" height="100%">`

**2. Era mini sparklines** (`app/src/components/SectionEvents.tsx`, Era cards, Slides 1–5)
- Location: the `<div className="h-14 ...">` box with a "chart" label inside the left column of each era card (around line 278)
- Replace with a pure SVG sparkline (no library needed for this size):
  - Filter the global timeline to the era's date range (`era.dateRange` gives the years; use `ERA_BOUNDARIES` for exact dates)
  - Normalize the `avg_tone` values to SVG coordinates (viewBox `0 0 200 56`)
  - Draw a `<path>` for the line
  - Draw a zero-baseline `<line>`
  - Fill area below/above 0 with red/green at low opacity

### Data gap — you must add a new API endpoint first

The current API only returns data for one date at a time. The charts need the **full time series aggregated globally**. Add:

**Step 1 — New query in `app/src/lib/queries.ts`**

Add a function `getGlobalTimeline(file: string)` that:
- Reads all rows from the parquet using the existing hyparquet setup (follow the pattern of `getSentimentByDate`)
- Groups by `date` in JavaScript
- Computes volume-weighted `avg_tone` per day: `sum(avg_tone * article_count) / sum(article_count)`
- Returns `{ date: string, avg_tone: number, article_count: number }[]` sorted by date ascending

**Step 2 — New API route `app/src/app/api/sentiment/timeline/route.ts`**

```ts
// GET /api/sentiment/timeline?file=<name>
// Returns: { timeline: { date: string, avg_tone: number, article_count: number }[] }
```

- Validate `file` param with the same regex used in the other routes (`/^[a-zA-Z0-9-]+$/`)
- Call `getGlobalTimeline(file)` and return as JSON
- Follow the exact same pattern as `app/src/app/api/sentiment/route.ts`

**Step 3 — Fetch in `SectionEvents.tsx` (or `page.tsx`)**

Option A (simpler): fetch inside `SectionEvents` on mount with `useEffect`, store in local state:
```ts
const [timeline, setTimeline] = useState<TimelineRow[]>([]);
useEffect(() => {
  fetch(`/api/sentiment/timeline?file=${TOPIC_FILE}`)
    .then(r => r.json())
    .then(d => setTimeline(d.timeline));
}, []);
```

Option B: fetch in `page.tsx` and pass as a prop to `SectionEvents` (consistent with how `eraIndices` and `dates` are already passed).

Use whichever is cleaner. The `TOPIC_FILE` constant is defined in `page.tsx` as `'elon-musk-2015-01-2026-05'`.

### Install Recharts

```bash
cd app && npm install recharts
```

Recharts has types bundled — no `@types/recharts` needed.

### Design constraints — match the existing aesthetic

The site uses a dark navy palette. Stick to these values:
- Background: `#00021a` / `#060e28`
- Muted text/borders: `#7683a6` / `rgba(118,131,166,0.x)`
- Positive sentiment: `#22c55e` (green)
- Negative sentiment: `#ef4444` (red)
- Primary text: `#ecf2ff`
- Chart axes/grid: `rgba(118,131,166,0.15)` — very subtle, don't overpower the line
- Do NOT add tooltips or legends unless they are very minimal and match the palette

For the sentiment line color: you can use a single white/light line, or split into green/red segments at y=0. A single colored line is simpler; segmented is more expressive.

### Files to touch

| File | What to do |
|---|---|
| `app/src/lib/queries.ts` | Add `getGlobalTimeline(file)` |
| `app/src/app/api/sentiment/timeline/route.ts` | Create new route |
| `app/src/components/SectionEvents.tsx` | Replace both placeholder divs with real charts |
| `app/package.json` | Add `recharts` via `npm install recharts` |

Do not modify `page.tsx` unless you choose Option B for the fetch location.

### Verification

1. `cd app && npm run dev`
2. Open http://localhost:3000 and scroll to the third section (Events)
3. Overview slide: confirm timeline chart fills the full height, era bands are visible, sentiment line moves over time
4. Swipe/scroll through era cards: confirm each `h-14` box shows a sparkline for that era's date range
5. No console errors about missing data
