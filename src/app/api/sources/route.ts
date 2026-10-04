import { NextRequest } from "next/server";
import { loadAllItems, loadNews, sourcesSummary } from "@/lib/news";

export const dynamic = "force-dynamic";

/** GET /api/sources?all=1 -> publishers and how many stories each has */
export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "1";
  const items = all ? await loadAllItems() : (await loadNews()).items;
  return Response.json({ ok: true, total_items: items.length, sources: sourcesSummary(items) });
}
