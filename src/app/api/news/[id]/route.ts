import { NextRequest } from "next/server";
import { findItem, isLang, localize } from "@/lib/news";

export const dynamic = "force-dynamic";

/** GET /api/news/:id?lang=en|fa  -> full article (text, all images, related links) */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const langParam = req.nextUrl.searchParams.get("lang") ?? "";
  const found = await findItem(id);
  if (!found) {
    return Response.json({ ok: false, error: "not_found", id }, { status: 404 });
  }
  const item = isLang(langParam) ? localize(found.item, langParam) : found.item;
  return Response.json(
    { ok: true, month: found.month, item },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
