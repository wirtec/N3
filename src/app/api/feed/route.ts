import { NextRequest } from "next/server";
import { isLang, loadNews } from "@/lib/news";

export const dynamic = "force-dynamic";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** GET /api/feed?lang=fa -> re-published RSS feed (bilingual titles, resolved links, images) */
export async function GET(req: NextRequest) {
  const langParam = req.nextUrl.searchParams.get("lang") ?? "en";
  const lang = isLang(langParam) ? langParam : "en";
  const store = await loadNews();
  const origin = req.nextUrl.origin;

  const items = store.items
    .map((it) => {
      const title = it.title[lang] || it.title.en;
      const summary = it.summary[lang] || it.summary.en;
      const imgs = it.images
        .map((u) => `<media:content url="${esc(u)}" medium="image" />`)
        .join("");
      return `<item>
  <title>${esc(title)}</title>
  <link>${esc(it.link)}</link>
  <guid isPermaLink="false">${it.id}</guid>
  <pubDate>${new Date(it.published).toUTCString()}</pubDate>
  <source url="${esc(it.link)}">${esc(it.source_name)}</source>
  <description>${esc(summary)}</description>
  ${it.main_image ? `<enclosure url="${esc(it.main_image)}" type="image/jpeg" />` : ""}
  ${imgs}
  <comments>${origin}/${lang}/news/${it.id}</comments>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>TechPulse (${lang}) – Technology news</title>
  <link>${origin}/${lang}</link>
  <description>Bilingual technology headlines scraped from Google News</description>
  <language>${lang === "fa" ? "fa-IR" : "en-US"}</language>
  <lastBuildDate>${new Date(store.generated_at).toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
