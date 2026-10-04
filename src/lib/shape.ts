import type { NewsItem } from "./news";

export type ApiLang = "en" | "fa" | "both";

export function parseLang(v: string | null): ApiLang {
  return v === "en" || v === "fa" ? v : "both";
}

/** Shape a news item for the public API according to the requested language. */
export function shape(i: NewsItem, lang: ApiLang, compact: boolean) {
  const bi = <T,>(v: { en: T; fa: T }) => (lang === "both" ? v : { [lang]: v[lang] ?? v[lang === "fa" ? "en" : "fa"] });
  const base: Record<string, unknown> = {
    id: i.id,
    title: bi(i.title),
    summary: bi(i.summary),
    published_at: i.published_at,
    scraped_at: i.scraped_at,
    source: i.source,
    author: i.author,
    url: i.url,
    google_url: i.google_url,
    image: i.image,
    images: i.images,
    related_links:
      lang === "both"
        ? i.related_links
        : i.related_links.map((r) => ({ ...r, title: lang === "fa" ? r.title_fa || r.title : r.title })),
  };
  if (!compact) base.content = bi(i.content);
  return base;
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, max-age=60, s-maxage=300",
};
