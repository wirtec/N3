import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { isLang, loadNews } from "@/lib/news";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const endpoints = [
  { m: "GET", p: "/api/news", en: "Current month list. Params: lang=en|fa, q, source, images=1, full=1, all=1, page, limit", fa: "لیست ماه جاری. پارامترها: lang=en|fa، q، source، images=1، full=1، all=1، page، limit" },
  { m: "GET", p: "/api/news/{id}?lang=fa", en: "Single article: full text, all images, related links (description links).", fa: "یک خبر: متن کامل، همه تصاویر، لینک‌های مرتبط (لینک‌های داخل description)." },
  { m: "GET", p: "/api/search?q=apple&lang=fa", en: "Database-backed search across the current month and all archives.", fa: "جست‌وجو در دیتابیس بین ماه جاری و همه آرشیوها." },
  { m: "GET", p: "/api/archive", en: "List archived months + current month.", fa: "لیست ماه‌های آرشیوشده + ماه جاری." },
  { m: "GET", p: "/api/archive/{YYYY-MM}", en: "Articles of an archived month (same params as /api/news).", fa: "خبرهای یک ماه آرشیوشده (همان پارامترهای /api/news)." },
  { m: "GET", p: "/api/sources?all=1", en: "Publishers and story counts.", fa: "ناشرها و تعداد خبر هرکدام." },
  { m: "GET", p: "/api/stats", en: "Dataset statistics (files + PostgreSQL mirror).", fa: "آمار دیتاست (فایل‌ها + آینه PostgreSQL)." },
  { m: "GET", p: "/api/feed?lang=fa", en: "Re-published RSS with resolved links, Persian titles and media images.", fa: "RSS بازنشر شده با لینک‌های واقعی، تیتر فارسی و تصاویر." },
  { m: "GET", p: "/data/news.json", en: "Raw JSON file written by the scraper (also /data/archive/index.json).", fa: "فایل خام JSON که اسکریپت می‌نویسد (و همچنین /data/archive/index.json)." },
  { m: "POST", p: "/api/sync", en: "Upsert news.json into PostgreSQL. Body = news.json document (optional). Bearer NEWS_SYNC_TOKEN.", fa: "درج news.json در PostgreSQL. بدنه = سند news.json (اختیاری). توکن Bearer با NEWS_SYNC_TOKEN." },
  { m: "GET", p: "/api/health", en: "Health check.", fa: "بررسی سلامت." },
];

const sampleItem = `{
  "id": "5f1d3c9a2b7e4d10",
  "title": { "en": "iPhone 18 Pro …", "fa": "آیفون ۱۸ پرو …" },
  "summary": { "en": "…", "fa": "…" },
  "content": { "en": "Full article text…", "fa": "متن کامل خبر…" },
  "published": "2026-09-04T22:26:06+00:00",
  "source_name": "MacRumors",
  "domain": "macrumors.com",
  "link": "https://www.macrumors.com/…",
  "google_link": "https://news.google.com/rss/articles/…",
  "main_image": "https://images.macrumors.com/…jpg",
  "images": ["https://…1.jpg", "https://…2.jpg"],
  "description_links": [
    { "title": { "en": "…", "fa": "…" }, "url": "https://news.google.com/…",
      "resolved_url": "https://www.bloomberg.com/…", "source": "Bloomberg" }
  ],
  "word_count": 1240,
  "reading_minutes": 6
}`;

export default async function DocsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = t(lang);
  const store = await loadNews();
  const sampleId = store.items[0]?.id ?? "{id}";
  const fa = lang === "fa";

  return (
    <>
      <Header lang={lang} path="/docs" />
      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <h1 className="font-display mt-10 text-4xl font-bold text-neon-gradient">{d.apiTitle}</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          {fa
            ? "این پروژه از سه بخش تشکیل شده: (۱) اسکریپت پایتون scraper/main.py که فید گوگل‌نیوز را می‌خواند، (۲) گیت‌هاب اکشن که هر ساعت آن را اجرا و data/news.json را کامیت می‌کند و (۳) این وب‌سایت Next.js که همان JSON را به‌صورت API و وب دوزبانه نمایش می‌دهد."
            : "The project has three parts: (1) the Python scraper scraper/main.py that reads the Google News feed, (2) a GitHub Action that runs it hourly and commits data/news.json, and (3) this Next.js site exposing the same JSON as an API and a bilingual website."}
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-white">{fa ? "اندپوینت‌ها" : "Endpoints"}</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <tbody>
                {endpoints.map((e) => (
                  <tr key={e.p} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="w-20 px-4 py-3 align-top">
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${e.m === "GET" ? "bg-lime/15 text-lime" : "bg-amber/15 text-amber"}`}>
                        {e.m}
                      </span>
                    </td>
                    <td className="px-2 py-3 align-top font-mono text-xs text-neon" dir="ltr">
                      {e.m === "GET" && !e.p.includes("{") ? (
                        <Link href={e.p} className="hover:underline">
                          {e.p}
                        </Link>
                      ) : e.p.includes("{id}") ? (
                        <Link href={e.p.replace("{id}", sampleId)} className="hover:underline">
                          {e.p}
                        </Link>
                      ) : (
                        e.p
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">{fa ? e.fa : e.en}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">{fa ? "ساختار هر خبر در news.json" : "Item shape in news.json"}</h2>
            <pre className="glass mt-4 overflow-x-auto rounded-2xl p-5 font-mono text-[11px] leading-relaxed text-slate-300">{sampleItem}</pre>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white">{fa ? "اجرای محلی" : "Run locally"}</h2>
            <pre className="glass mt-4 overflow-x-auto rounded-2xl p-5 font-mono text-[11px] leading-relaxed text-slate-300">{`# 1) Scraper (Python 3.10+)
pip install -r scraper/requirements.txt
python scraper/main.py              # hourly job
python scraper/main.py --limit 5    # quick test
python scraper/main.py --archive    # rotate month manually

# 2) Website + API (Node 20+, PostgreSQL)
npm install
npx drizzle-kit push                # create tables
npm run dev                         # http://localhost:3000

# 3) Sync JSON -> PostgreSQL (optional, automatic on page load)
curl -X POST http://localhost:3000/api/sync`}</pre>

            <h2 className="font-display mt-8 text-2xl font-bold text-white">{fa ? "گیت‌هاب اکشن" : "GitHub Action"}</h2>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-sm text-slate-300">
              <li>{fa ? "فایل .github/workflows/news.yml — کرون هر ساعت (7 * * * *) اسکریپت را اجرا و data/news.json را کامیت می‌کند." : "File .github/workflows/news.yml — hourly cron (7 * * * *) runs the scraper and commits data/news.json."}</li>
              <li>{fa ? "کرون ماهانه (2 0 1 * *) اول هر ماه news.json را به data/archive/news-YYYY-MM.json منتقل می‌کند و فایل news.json جدید و خالی می‌سازد. (اسکریپت خودش هم تغییر ماه را تشخیص می‌دهد.)" : "Monthly cron (2 0 1 * *) moves news.json to data/archive/news-YYYY-MM.json and starts a fresh news.json. (The script also detects a month change on its own.)"}</li>
              <li>{fa ? "در Settings → Actions → General گزینه Read and write permissions را فعال کنید تا بات بتواند push کند." : "Enable Settings → Actions → General → “Read and write permissions” so the bot can push."}</li>
              <li>{fa ? "اجرای دستی: تب Actions → TechPulse News Scraper → Run workflow (با ورودی‌های limit و archive)." : "Manual run: Actions tab → TechPulse News Scraper → Run workflow (inputs: limit, archive)."}</li>
              <li>{fa ? "اختیاری: متغیر NEWS_SYNC_URL و سکرت NEWS_SYNC_TOKEN را تنظیم کنید تا بعد از هر اجرا، JSON به /api/sync سایت مستقر شده POST شود." : "Optional: set the NEWS_SYNC_URL variable and NEWS_SYNC_TOKEN secret so each run POSTs the JSON to /api/sync of your deployed site."}</li>
            </ul>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-white">{fa ? "نمونه فراخوانی" : "Example calls"}</h2>
          <pre className="glass mt-4 overflow-x-auto rounded-2xl p-5 font-mono text-[11px] leading-relaxed text-slate-300">{`curl "/api/news?lang=fa&limit=5"                 # Persian, 5 newest
curl "/api/news?q=apple&images=1&full=1"          # search + only with images + full text
curl "/api/news/${sampleId}?lang=en"     # one article
curl "/api/archive"                               # months
curl "/api/archive/${store.month}?lang=fa"             # this month via archive API
curl -X POST -H "Authorization: Bearer $TOKEN" \\
     -H "Content-Type: application/json" \\
     --data-binary @data/news.json "/api/sync"   # push dataset`}</pre>
        </section>
      </main>
    </>
  );
}
