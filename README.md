# 🛰️ NOVA · Tech News from orbit

Bilingual (English / فارسی) technology news, scraped **every hour** from the Google News RSS
Technology feed with **Python + GitHub Actions**, served as a JSON **API** and a 3D / space‑themed
**Next.js** website (PostgreSQL via Drizzle).

```
Google News RSS ─▶ scraper/fetch_news.py ─▶ public/data/news.json ─▶ Next.js API + Web (EN/FA)
                        │ (hourly, GitHub Actions)        │
                        └── scraper/archive.py ───────────▶ public/data/archive/news-YYYY-MM.json (monthly)
```

## What the scraper collects (per RSS item)

| field | description |
|---|---|
| `title.en / title.fa` | headline + Persian translation |
| `published_at` | RSS pubDate (ISO‑8601) |
| `google_url` | original `news.google.com/rss/articles/…` link |
| `url` | **decoded** publisher URL |
| `related_links[]` | every link inside the RSS `<description>` with its own title (+ `title_fa`, source, decoded url) |
| `content.en / content.fa` | main article text (trafilatura) + Persian translation |
| `summary.en / summary.fa` | meta description / first paragraph |
| `images[]` | og:image, ld+json images and in‑article `<img>` (icons/trackers filtered) |
| `image` | hero image |
| `source`, `author`, `scraped_at` | metadata |

## 1 · Run the scraper locally

```bash
pip install -r scraper/requirements.txt
python scraper/fetch_news.py                 # writes public/data/news.json
MAX_NEW_PER_RUN=20 TRANSLATE=0 python scraper/fetch_news.py
python scraper/archive.py                    # monthly rotation (idempotent)
FORCE=1 python scraper/archive.py            # rotate now
```

Env vars: `FEED_URL`, `OUTPUT`, `MAX_ITEMS` (120), `MAX_NEW_PER_RUN` (40), `TRANSLATE` (1),
`MAX_TRANSLATE_CHARS` (6000), `REQUEST_TIMEOUT` (20).

## 2 · GitHub Action (hourly + monthly archive)

`.github/workflows/news.yml` is included.

1. Push this repo to GitHub.
2. **Settings → Actions → General → Workflow permissions → Read and write permissions** (so the bot can commit `news.json`).
3. **Actions → “Nova Tech News – hourly scrape” → Run workflow** (first run). After that it runs automatically:
   * every hour: `7 * * * *` → scrape new stories, commit `public/data/news.json`
   * 1st of each month: `2 0 1 * *` → `archive.py` moves last month's file to
     `public/data/archive/news-YYYY-MM.json`, rebuilds `archive/index.json`, and starts a fresh `news.json`.
4. Public raw endpoints (no server needed):
   * `https://raw.githubusercontent.com/<USER>/<REPO>/main/public/data/news.json`
   * `https://raw.githubusercontent.com/<USER>/<REPO>/main/public/data/archive/index.json`
5. *(optional)* Add repo **Variable** `SYNC_URL=https://your-site/api/sync` and **Secret** `SYNC_TOKEN`
   so the Action pings your deployed site to re‑import the JSON into PostgreSQL after every run.

## 3 · Website / API (Next.js + PostgreSQL)

```bash
npm install
# .env → DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
npx drizzle-kit push
npm run dev            # http://localhost:3000
```

Optional env: `SYNC_TOKEN` (protects `POST /api/sync`), `NEWS_JSON_URL` (remote news.json for sync).

The site reads from PostgreSQL; if the DB is empty it auto‑imports `public/data/news.json`; if the DB is
unreachable it falls back to the JSON file. Language is switched with the **فارسی / English** button
(cookie based, RTL/LTR aware).

### Endpoints

| method | path | description |
|---|---|---|
| GET | `/api/news?lang=en\|fa\|both&q=&source=&limit=&offset=&fields=compact` | latest stories |
| GET | `/api/news/:id?lang=` | one story: full bilingual text, all images, related links |
| GET | `/api/archive` | list of monthly archives |
| GET | `/api/archive/:month?lang=` | stories of `YYYY-MM` |
| GET | `/api/sources` | publishers + counts |
| POST | `/api/sync[?url=]` | import news.json into PostgreSQL (`Authorization: Bearer SYNC_TOKEN`) |
| GET | `/data/news.json`, `/data/archive/index.json` | raw static files |

Web pages: `/` (feed, search, source filter), `/news/:id` (article + gallery + EN/FA), `/archive`,
`/archive/:month`, `/docs` (bilingual guide).
