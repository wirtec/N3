import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const endpoints = [
  { m: "GET", p: "/api/news", en: "Latest stories (current month). Params: lang=en|fa|both, q, source, limit, offset, fields=compact", fa: "آخرین خبرها (ماه جاری). پارامترها: lang=en|fa|both، q (جستجو)، source (منبع)، limit، offset، fields=compact" },
  { m: "GET", p: "/api/news/:id", en: "One story with full bilingual body, all images & related links", fa: "یک خبر با متن کامل دو زبانه، همه‌ی تصاویر و لینک‌های مرتبط" },
  { m: "GET", p: "/api/archive", en: "List of monthly archive files (news-YYYY-MM.json)", fa: "لیست فایل‌های آرشیو ماهانه (news-YYYY-MM.json)" },
  { m: "GET", p: "/api/archive/:month", en: "Stories of an archived month, e.g. /api/archive/2026-08", fa: "خبرهای یک ماه آرشیوشده، مثلاً /api/archive/2026-08" },
  { m: "GET", p: "/api/sources", en: "Publishers and counts", fa: "منابع خبری و تعداد خبرها" },
  { m: "POST", p: "/api/sync", en: "Import news.json (file or ?url=) into PostgreSQL. Auth: Bearer SYNC_TOKEN", fa: "ایمپورت news.json (فایل یا ?url=) داخل PostgreSQL. احراز هویت: Bearer SYNC_TOKEN" },
  { m: "GET", p: "/data/news.json", en: "Raw static JSON produced by the Python scraper (also on GitHub raw URL)", fa: "فایل خام JSON تولیدشده توسط اسکریپت پایتون (روی GitHub raw هم در دسترس است)" },
  { m: "GET", p: "/data/archive/index.json", en: "Raw archive index", fa: "ایندکس خام آرشیوها" },
];

export default async function DocsPage() {
  const lang = await getLang();
  const d = t(lang);
  const fa = lang === "fa";

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <header className="text-center">
        <h1 className="font-display neon-text text-3xl font-black md:text-5xl">{d.docsTitle}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-300">
          {fa
            ? "همه چیز درباره‌ی اجرای اسکریپت پایتون، گیت‌هاب اکشن ساعتی، آرشیو ماهانه و اندپوینت‌های API."
            : "Everything about running the Python scraper, the hourly GitHub Action, monthly archives and the API endpoints."}
        </p>
      </header>

      {/* Pipeline */}
      <Section title={fa ? "۱) خط لوله چطور کار می‌کند؟" : "1) How the pipeline works"}>
        <ol className="list-inside list-decimal space-y-2 text-sm leading-7 text-slate-300">
          <li>{fa ? "فید RSS گوگل‌نیوز (موضوع فناوری) دانلود می‌شود: عنوان، تاریخ، لینک، منبع." : "Download the Google News RSS feed (Technology topic): title, pubDate, link, source."}</li>
          <li>{fa ? "لینک‌های داخل description همراه با عنوان هر کدام استخراج می‌شوند (related_links)." : "Every <a> inside the description is extracted with its title (related_links)."}</li>
          <li>{fa ? "لینک ریدایرکت news.google.com با متد batchexecute به آدرس واقعی ناشر دیکد می‌شود." : "The news.google.com redirect link is decoded (batchexecute method) into the real publisher URL."}</li>
          <li>{fa ? "صفحه‌ی خبر باز شده، متن اصلی (trafilatura)، خلاصه، نویسنده و همه‌ی تصاویر (og:image + تصاویر داخل مقاله) برداشته می‌شود." : "The article page is opened; main text (trafilatura), summary, author and all images (og:image + in-article images) are extracted."}</li>
          <li>{fa ? "عنوان، خلاصه و متن به فارسی ترجمه می‌شود (deep-translator / Google)." : "Title, summary and body are translated to Persian (deep-translator / Google)."}</li>
          <li>{fa ? "نتیجه در public/data/news.json ذخیره می‌شود؛ آیتم‌های قبلی دوباره واکشی نمی‌شوند." : "Result is written to public/data/news.json; already-scraped items are reused, not re-fetched."}</li>
        </ol>
      </Section>

      {/* Run locally */}
      <Section title={fa ? "۲) اجرای محلی اسکریپت پایتون" : "2) Run the Python scraper locally"}>
        <pre>{`pip install -r scraper/requirements.txt

# scrape (writes public/data/news.json)
python scraper/fetch_news.py

# options
MAX_NEW_PER_RUN=20 TRANSLATE=0 python scraper/fetch_news.py
FEED_URL="https://news.google.com/rss/topics/<ID>?hl=en-US&gl=US&ceid=US:en" python scraper/fetch_news.py

# monthly rotation -> public/data/archive/news-YYYY-MM.json
python scraper/archive.py           # only rotates when month changed
FORCE=1 python scraper/archive.py   # rotate now`}</pre>
        <table className="mt-4 w-full text-xs text-slate-300">
          <tbody>
            {[
              ["FEED_URL", fa ? "آدرس فید RSS" : "RSS feed URL"],
              ["MAX_ITEMS", fa ? "حداکثر آیتم نگه‌داشته‌شده در news.json (پیش‌فرض ۱۲۰)" : "Max items kept in news.json (default 120)"],
              ["MAX_NEW_PER_RUN", fa ? "حداکثر خبر جدید در هر اجرا (پیش‌فرض ۴۰)" : "Max new articles scraped per run (default 40)"],
              ["TRANSLATE", fa ? "۱ = ترجمه به فارسی (پیش‌فرض)، ۰ = بدون ترجمه" : "1 = translate to Persian (default), 0 = off"],
              ["MAX_TRANSLATE_CHARS", fa ? "تعداد کاراکتر متن که ترجمه می‌شود (پیش‌فرض ۶۰۰۰)" : "Body characters translated (default 6000)"],
            ].map(([k, v]) => (
              <tr key={k} className="border-t border-white/5">
                <td className="py-2 pe-4 font-mono text-cyan-200" dir="ltr">{k}</td>
                <td className="py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* GitHub Action */}
      <Section title={fa ? "۳) گیت‌هاب اکشن: هر ساعت + آرشیو ماهانه" : "3) GitHub Action: hourly + monthly archive"}>
        <p className="text-sm leading-7 text-slate-300">
          {fa
            ? "فایل .github/workflows/news.yml از قبل آماده است. کافی است ریپو را روی گیت‌هاب push کنید:"
            : "The workflow file .github/workflows/news.yml is ready. Just push the repository to GitHub:"}
        </p>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-7 text-slate-300">
          <li>
            {fa ? "در ریپو بروید به " : "In the repo go to "}
            <b>Settings → Actions → General → Workflow permissions</b>
            {fa ? " و گزینه‌ی " : " and enable "}
            <b>Read and write permissions</b>
            {fa ? " را فعال کنید (برای commit خودکار news.json)." : " (needed to auto-commit news.json)."}
          </li>
          <li>
            {fa ? "تب Actions → «Nova Tech News – hourly scrape» → Run workflow برای اولین اجرای دستی." : "Actions tab → “Nova Tech News – hourly scrape” → Run workflow for the first manual run."}
          </li>
          <li>
            {fa ? "از این به بعد هر ساعت (cron: 7 * * * *) اجرا شده و news.json را کامیت می‌کند." : "From now on it runs every hour (cron: 7 * * * *) and commits news.json."}
          </li>
          <li>
            {fa
              ? "اول هر ماه (cron: 2 0 1 * *) اسکریپت archive.py فایل news.json ماه قبل را به public/data/archive/news-YYYY-MM.json منتقل می‌کند و یک news.json تازه می‌سازد."
              : "On the 1st of each month (cron: 2 0 1 * *) archive.py moves the previous month's news.json to public/data/archive/news-YYYY-MM.json and starts a fresh news.json."}
          </li>
          <li>
            {fa ? "(اختیاری) برای همگام‌سازی خودکار با دیتابیس سایت، در Settings → Secrets and variables → Actions یک Variable با نام SYNC_URL (مثلاً https://your-site.com/api/sync) و یک Secret با نام SYNC_TOKEN بسازید." : "(Optional) To auto-sync the deployed site's database, add a Variable SYNC_URL (e.g. https://your-site.com/api/sync) and a Secret SYNC_TOKEN under Settings → Secrets and variables → Actions."}
          </li>
        </ol>
        <pre className="mt-4">{`# public raw endpoints after the first Action run:
https://raw.githubusercontent.com/<USER>/<REPO>/main/public/data/news.json
https://raw.githubusercontent.com/<USER>/<REPO>/main/public/data/archive/index.json
https://raw.githubusercontent.com/<USER>/<REPO>/main/public/data/archive/news-2026-08.json`}</pre>
      </Section>

      {/* Web app */}
      <Section title={fa ? "۴) اجرای وب‌سایت (Next.js + PostgreSQL)" : "4) Run the website (Next.js + PostgreSQL)"}>
        <pre>{`npm install
# .env -> DATABASE_URL=postgresql://user:pass@host:5432/db
npx drizzle-kit push        # create tables
npm run dev                 # http://localhost:3000

# optional env
SYNC_TOKEN=<secret>         # protects POST /api/sync
NEWS_JSON_URL=https://raw.githubusercontent.com/<USER>/<REPO>/main/public/data/news.json`}</pre>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {fa
            ? "سایت ابتدا از PostgreSQL می‌خواند؛ اگر دیتابیس خالی باشد خودکار news.json را ایمپورت می‌کند و در صورت در دسترس نبودن دیتابیس مستقیماً فایل JSON را نمایش می‌دهد."
            : "The site reads from PostgreSQL first; if the DB is empty it auto-imports news.json, and if the DB is unavailable it falls back to the JSON file directly."}
        </p>
      </Section>

      {/* Endpoints */}
      <Section title={fa ? "۵) اندپوینت‌های API" : "5) API endpoints"}>
        <div className="space-y-2">
          {endpoints.map((e) => (
            <div key={e.p} className="glass flex flex-col gap-1 rounded-2xl p-4 sm:flex-row sm:items-center sm:gap-4">
              <span className={`w-14 shrink-0 rounded-md px-2 py-0.5 text-center font-mono text-[11px] font-bold ${e.m === "GET" ? "bg-emerald-400/20 text-emerald-200" : "bg-fuchsia-400/20 text-fuchsia-200"}`}>{e.m}</span>
              <a href={e.p.includes(":") ? undefined : e.p} target="_blank" rel="noreferrer" className="font-mono text-sm text-cyan-200" dir="ltr">{e.p}</a>
              <span className="text-xs text-slate-400 sm:ms-auto sm:max-w-md">{fa ? e.fa : e.en}</span>
            </div>
          ))}
        </div>
        <pre className="mt-4">{`# examples
curl "https://your-site.com/api/news?lang=fa&limit=10&fields=compact"
curl "https://your-site.com/api/news?q=apple&lang=en"
curl "https://your-site.com/api/news/<id>?lang=both"
curl "https://your-site.com/api/archive/2026-08?lang=fa"
curl -X POST "https://your-site.com/api/sync" -H "Authorization: Bearer $SYNC_TOKEN"`}</pre>
      </Section>

      {/* JSON schema */}
      <Section title={fa ? "۶) ساختار هر آیتم در news.json" : "6) Shape of each item in news.json"}>
        <pre>{`{
  "id": "3f9a1c2b7d8e4f60",
  "title":   { "en": "...", "fa": "..." },
  "summary": { "en": "...", "fa": "..." },
  "content": { "en": "full article text", "fa": "متن کامل ترجمه‌شده" },
  "published_at": "2026-09-05T10:12:00+00:00",
  "scraped_at":   "2026-09-05T11:07:31+00:00",
  "source": "The Verge",
  "author": "…",
  "url": "https://www.theverge.com/…",          // decoded publisher url
  "google_url": "https://news.google.com/rss/articles/…",
  "image": "https://…/hero.jpg",
  "images": [ { "url": "…", "alt": "…", "type": "hero|content" } ],
  "related_links": [
    { "title": "…", "title_fa": "…", "source": "CNET", "url": "https://…", "google_url": "…" }
  ]
}`}</pre>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass neon-border rounded-3xl p-6 md:p-8">
      <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}
