import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR, NEWS_FILE, type NewsStore } from "@/lib/news";
import { syncAll, syncStore } from "@/lib/sync";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const token = process.env.NEWS_SYNC_TOKEN;
  if (!token) return true; // no token configured -> open (local/dev)
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${token}`;
}

/**
 * POST /api/sync
 *   - With a JSON body (a news.json document): writes it to data/news.json (or
 *     data/archive/news-YYYY-MM.json when `archived_at` is set) and upserts it
 *     into PostgreSQL. Used by the GitHub Action "Sync to deployed API" step.
 *   - Without body: re-reads local data files and upserts everything.
 *   Protected by NEWS_SYNC_TOKEN (Bearer) when that env var is set.
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const force = req.nextUrl.searchParams.get("force") === "1";
  let body: NewsStore | null = null;
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as NewsStore;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body && Array.isArray(body.items) && body.month) {
    const isArchive = Boolean(body.archived_at);
    const target = isArchive
      ? path.join(DATA_DIR, "archive", `news-${body.month}.json`)
      : NEWS_FILE;
    try {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, JSON.stringify(body, null, 2), "utf-8");
    } catch (err) {
      // read-only filesystem (e.g. serverless) -> still sync to DB
      console.warn("[sync] could not write file:", err);
    }
    const result = await syncStore(body, isArchive ? `archive/news-${body.month}.json` : "news.json", true);
    return Response.json({ ok: true, mode: "body", written: target.replace(process.cwd(), ""), result });
  }

  const result = await syncAll(force);
  return Response.json({ ...result, mode: "files" }, { status: result.ok ? 200 : 500 });
}

/** GET /api/sync -> same as POST without body (convenient for browsers) */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await syncAll(req.nextUrl.searchParams.get("force") === "1");
  return Response.json({ ...result, mode: "files" }, { status: result.ok ? 200 : 500 });
}
