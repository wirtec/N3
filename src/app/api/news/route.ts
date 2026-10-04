import { NextRequest } from "next/server";
import { filterItems, isLang, loadAllItems, loadNews, localize, toCard } from "@/lib/news";
import { ensureSynced } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * GET /api/news
 *   ?lang=en|fa        -> flatten bilingual fields to a single language
 *   ?q=keyword         -> search in titles / summaries / content
 *   ?source=verge      -> filter by source name or domain
 *   ?images=1          -> only items that have images
 *   ?full=1            -> include full article text (omitted by default)
 *   ?all=1             -> include archived months too
 *   ?page=1&limit=20   -> pagination (limit max 100)
 */
export async function GET(req: NextRequest) {
  void ensureSynced();
  const sp = req.nextUrl.searchParams;
  const langParam = sp.get("lang") ?? "";
  const lang = isLang(langParam) ? langParam : null;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 20) || 20));
  const full = sp.get("full") === "1" || sp.get("full") === "true";
  const all = sp.get("all") === "1" || sp.get("all") === "true";

  const store = await loadNews();
  const base = all ? await loadAllItems() : store.items;
  const filtered = filterItems(base, {
    q: sp.get("q") ?? undefined,
    source: sp.get("source") ?? undefined,
    withImages: sp.get("images") === "1",
  });
  const start = (page - 1) * limit;
  const slice = filtered.slice(start, start + limit);
  const items = slice.map((it) => {
    const base = full ? it : toCard(it);
    return lang ? localize(base, lang) : base;
  });

  return Response.json(
    {
      ok: true,
      source: store.source,
      month: store.month,
      generated_at: store.generated_at,
      total: filtered.length,
      page,
      limit,
      pages: Math.max(1, Math.ceil(filtered.length / limit)),
      lang: lang ?? "both",
      items,
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } },
  );
}
