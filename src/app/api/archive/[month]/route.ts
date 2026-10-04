import { NextRequest } from "next/server";
import { readArchiveMonth } from "@/lib/news";
import { shape, parseLang, CORS } from "@/lib/shape";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: CORS });
}

/** GET /api/archive/:month  (month = YYYY-MM)  ?lang=en|fa|both&fields=compact */
export async function GET(req: NextRequest, ctx: { params: Promise<{ month: string }> }) {
  const { month } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const lang = parseLang(sp.get("lang"));
  const compact = sp.get("fields") === "compact";
  const data = await readArchiveMonth(month);
  if (!data) return Response.json({ ok: false, error: "archive not found" }, { status: 404, headers: CORS });
  return Response.json(
    {
      ok: true,
      month: data.month ?? month,
      generated_at: data.generated_at,
      count: data.items.length,
      lang,
      items: data.items.map((i) => shape(i, lang, compact)),
    },
    { headers: CORS },
  );
}
