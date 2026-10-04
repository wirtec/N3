import { NextRequest } from "next/server";
import { syncFromFileOrUrl } from "@/lib/news";
import { CORS } from "@/lib/shape";

export const dynamic = "force-dynamic";

/**
 * POST /api/sync            – import public/data/news.json into PostgreSQL
 * POST /api/sync?url=https://raw.githubusercontent.com/<user>/<repo>/main/public/data/news.json
 *
 * Protected by the SYNC_TOKEN env var (Authorization: Bearer <token>).
 * If SYNC_TOKEN is not set the endpoint is open (fine for local/dev).
 * The GitHub Action calls this after every scrape when `vars.SYNC_URL` is configured.
 */
export async function POST(req: NextRequest) {
  const token = process.env.SYNC_TOKEN;
  if (token) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${token}`) return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: CORS });
  }
  const url = req.nextUrl.searchParams.get("url") ?? process.env.NEWS_JSON_URL ?? undefined;
  try {
    const result = await syncFromFileOrUrl(url);
    return Response.json({ ok: true, ...result, synced_at: new Date().toISOString() }, { headers: CORS });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500, headers: CORS });
  }
}

export function GET() {
  return Response.json(
    { ok: true, usage: "POST /api/sync[?url=<news.json url>] with 'Authorization: Bearer <SYNC_TOKEN>'" },
    { headers: CORS },
  );
}
