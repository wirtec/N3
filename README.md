# TechPulse — Bilingual Google News (Technology) scraper, API & website

> 🇬🇧 English first, 🇮🇷 راهنمای فارسی در ادامه

Scrapes the Google News **Technology** RSS topic every hour with a GitHub Action,
resolves every article to its real publisher URL, extracts the **full text and all
images**, translates everything to **Persian**, and serves it as a **JSON API** and a
**bilingual (fa/en) tech-news website**.

```
Feed:  https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGRqTVhZU0JXVnVMVlZUR2dKVlV5Z0FQAQ?hl=en-US&gl=US&ceid=US:en
```

## Project layout

| Path | What it is |
| --- | --- |
| `scraper/main.py` | Python scraper (feed → resolve → extract text/images → translate → `data/news.json`) |
| `scraper/requirements.txt` | Python dependencies |
| `.github/workflows/news.yml` | GitHub Action: hourly scrape + monthly archive + commit |
| `data/news.json` | **Current month** dataset (always the same file name) |
| `data/archive/news-YYYY-MM.json` | Previous months, rotated automatically |
| `data/archive/index.json` | Index of archived months |
| `src/app/api/**` | Next.js API routes |
| `src/app/[lang]/**` | Website (`/en`, `/fa`) |
| `src/db/schema.ts` | PostgreSQL mirror (Drizzle) used for cross-month search & stats |

## What the scraper collects for every feed item

* `title` (en + fa), `pubDate` → `published`, Google link + **resolved real link**
* Every link inside the RSS `<description>` with its title (en + fa) and source
  (`description_links[]`, each also resolved to the real URL)
* Full article body (`content.en`, machine-translated `content.fa`)
* `summary` (og:description), `author`, `source_name`, `domain`
* `main_image` (og:image / twitter:image) and **all content images** (`images[]`)
* `word_count`, `reading_minutes`, `fetched_at`

Items are de-duplicated by id (sha1 of the Google GUID) — already processed items
are kept and not re-fetched, so hourly runs are cheap.

## Run the scraper locally

```bash
pip install -r scraper/requirements.txt
python scraper/main.py              # normal hourly run (max 40 new items)
python scraper/main.py --limit 5    # quick test
python scraper/main.py --archive    # force month rotation
python scraper/main.py --no-translate
```

Env vars: `FEED_URL`, `MAX_ITEMS` (40), `MAX_TRANSLATE_CHARS` (6000), `MAX_IMAGES` (12), `REQUEST_TIMEOUT` (20).

## GitHub Action — how to run it

1. Push this repository to GitHub.
2. **Settings → Actions → General → Workflow permissions → “Read and write permissions”** (so the bot can commit `data/`).
3. The workflow `.github/workflows/news.yml` then runs automatically:
   * `7 * * * *` — every hour: scrape, update `data/news.json`, commit.
   * `2 0 1 * *` — first day of each month: move `news.json` → `data/archive/news-<previous-month>.json`
     and start a fresh `news.json` (the script also detects the month change by itself).
4. Manual run: **Actions → TechPulse News Scraper → Run workflow** (inputs `limit`, `archive`).
5. Optional: repository **variable** `NEWS_SYNC_URL=https://your-site.com` and **secret**
   `NEWS_SYNC_TOKEN` → after every run the JSON is POSTed to `/api/sync` of the deployed site.

## Website + API

```bash
npm install
npx drizzle-kit push      # creates the articles / sync_state tables
npm run dev               # http://localhost:3000  (redirects to /fa)
```

Set `NEWS_SYNC_TOKEN` in `.env` to protect `/api/sync` in production.

### Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/news` | Current month. Params: `lang=en|fa`, `q`, `source`, `images=1`, `full=1`, `all=1`, `page`, `limit` |
| GET | `/api/news/{id}?lang=fa` | One article with full text, all images, related links |
| GET | `/api/search?q=…&lang=fa` | DB search across current month + all archives |
| GET | `/api/archive` | Archived months + current month |
| GET | `/api/archive/{YYYY-MM}` | Articles of an archived month |
| GET | `/api/sources?all=1` | Publishers & counts |
| GET | `/api/stats` | Dataset + database statistics |
| GET | `/api/feed?lang=fa` | Re-published RSS (resolved links, Persian titles, images) |
| GET | `/data/news.json` | Raw file (also `/data/archive/index.json`, `/data/archive/news-YYYY-MM.json`) |
| POST | `/api/sync` | Upsert JSON into PostgreSQL (body optional, `Authorization: Bearer <NEWS_SYNC_TOKEN>`) |
| GET | `/api/health` | Health check |

Web pages: `/{en|fa}`, `/{lang}/news/{id}`, `/{lang}/archive`, `/{lang}/archive/{YYYY-MM}`, `/{lang}/docs`.

---

# راهنمای فارسی

این پروژه فید **فناوری گوگل‌نیوز** را هر ساعت با گیت‌هاب اکشن می‌خواند، لینک هر خبر را به
آدرس واقعی ناشر تبدیل می‌کند، **متن کامل و همهٔ تصاویر** خبر را استخراج می‌کند، همه‌چیز را به
**فارسی** ترجمه می‌کند و نتیجه را هم به‌صورت **API (JSON)** و هم در یک **وب‌سایت دوزبانهٔ خبری**
نمایش می‌دهد.

## چه چیزهایی از هر خبر برداشته می‌شود؟

* تیتر (انگلیسی + فارسی)، تاریخ انتشار، لینک گوگل و **لینک واقعی**
* همهٔ لینک‌های داخل `description` فید به همراه تیتر (en/fa) و نام منبع هرکدام (`description_links`)
* متن کامل خبر (`content.en`) و ترجمهٔ فارسی آن (`content.fa`)
* خلاصه، نویسنده، نام منبع، دامنه
* تصویر اصلی (`main_image`) و **تمام تصاویر** متن خبر (`images`)
* تعداد کلمات و زمان مطالعه

## اجرای اسکریپت روی سیستم خودتان

```bash
pip install -r scraper/requirements.txt
python scraper/main.py              # اجرای عادی (حداکثر ۴۰ خبر جدید)
python scraper/main.py --limit 5    # تست سریع
python scraper/main.py --archive    # آرشیو دستی ماه جاری
```

## راه‌اندازی گیت‌هاب اکشن (هر ساعت + آرشیو ماهانه)

1. ریپازیتوری را روی گیت‌هاب push کنید.
2. در **Settings → Actions → General → Workflow permissions** گزینهٔ **Read and write permissions** را فعال کنید.
3. ورک‌فلو `.github/workflows/news.yml` خودکار اجرا می‌شود:
   * هر ساعت (`7 * * * *`): فید خوانده می‌شود، `data/news.json` به‌روز و کامیت می‌شود.
   * اول هر ماه (`2 0 1 * *`): `news.json` به `data/archive/news-<ماه قبل>.json` منتقل می‌شود و
     یک `news.json` تازه ساخته می‌شود. (خود اسکریپت هم تغییر ماه را تشخیص می‌دهد.)
4. اجرای دستی: تب **Actions → TechPulse News Scraper → Run workflow**.
5. اختیاری: متغیر `NEWS_SYNC_URL` و سکرت `NEWS_SYNC_TOKEN` را تنظیم کنید تا بعد از هر اجرا،
   JSON به `/api/sync` سایت مستقرشده ارسال شود.

## اجرای سایت و API

```bash
npm install
npx drizzle-kit push
npm run dev      # http://localhost:3000 → /fa
```

مسیر وب: `/fa` و `/en` (دکمهٔ تغییر زبان در هدر)، صفحهٔ خبر `/fa/news/{id}`، آرشیو `/fa/archive`،
مستندات `/fa/docs`. لیست کامل اندپوینت‌ها در جدول بالا و در صفحهٔ `/fa/docs` آمده است.

> متن فارسی ترجمهٔ ماشینی (Google Translate از طریق deep-translator) است. محتوا و تصاویر
> متعلق به ناشران اصلی هستند.
