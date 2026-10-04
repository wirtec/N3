import { NextRequest } from "next/server";
import { filterItems, isLang, loadArchiveMonth, localize, toCard } from "@/lib/news";

export const dynamic = "force-dynamic";

/** GET /api/archive/:month (YYYY-MM) ?lang=&q=&full=1&page=&limit= */
export async function GET(req: NextRequest, ctx: { params: Promise<{ month: string }> }) {
  const { month } = await ctx.params;
  const store = await loadArchiveMonth(month);
  if (!store) {
    return Response.json({ ok: false, error: "month_not_found", month }, { status: 404 });
  }
  const sp = req.nextUrl.searchParams;
  const langParam = sp.get("lang") ?? "";
  const lang = isLang(langParam) ? langParam : null;
  const full = sp.get("full") === "1";
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 50) || 50));
  const filtered = filterItems(store.items, { q: sp.get("q") ?? undefined, source: sp.get("source") ?? undefined });
  const slice = filtered.slice((page - 1) * limit, page * limit);
  return Response.json({
    ok: true,
    month: store.month,
    generated_at: store.generated_at,
    archived_at: store.archived_at ?? null,
    total: filtered.length,
    page,
    limit,
    pages: Math.max(1, Math.ceil(filtered.length / limit)),
    items: slice.map((it) => {
      const b = full ? it : toCard(it);
      return lang ? localize(b, lang) : b;
    }),
  });
}
