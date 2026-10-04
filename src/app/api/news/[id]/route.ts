import { NextRequest } from "next/server";
import { getNewsItem } from "@/lib/news";
import { shape, parseLang, CORS } from "@/lib/shape";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: CORS });
}

/** GET /api/news/:id?lang=en|fa|both */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const lang = parseLang(req.nextUrl.searchParams.get("lang"));
  const item = await getNewsItem(id);
  if (!item) return Response.json({ ok: false, error: "not found" }, { status: 404, headers: CORS });
  return Response.json({ ok: true, lang, item: shape(item, lang, false) }, { headers: CORS });
}
