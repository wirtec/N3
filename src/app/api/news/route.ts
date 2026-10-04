import { NextRequest } from "next/server";
import { listNews } from "@/lib/news";
import { shape, parseLang, CORS } from "@/lib/shape";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: CORS });
}

/**
 * GET /api/news
 *   ?lang=en|fa|both  (default both)  – which language fields to return
 *   ?q=...            – search in title/summary (en+fa)
 *   ?source=verge     – filter by publisher name
 *   ?limit=50&offset=0
 *   ?fields=compact   – omit full article body
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = parseLang(sp.get("lang"));
  const limit = Number(sp.get("limit") ?? 50) || 50;
  const offset = Number(sp.get("offset") ?? 0) || 0;
  const compact = sp.get("fields") === "compact";
  const q = sp.get("q") ?? undefined;
  const source = sp.get("source") ?? undefined;

  const { items, total, meta } = await listNews({ limit, offset, q, source });

  return Response.json(
    {
      ok: true,
      ...meta,
      total,
      count: items.length,
      limit,
      offset,
      lang,
      items: items.map((i) => shape(i, lang, compact)),
    },
    { headers: CORS },
  );
}
