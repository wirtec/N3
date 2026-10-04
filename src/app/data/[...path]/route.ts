import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/news";

export const dynamic = "force-dynamic";

/** GET /data/news.json | /data/archive/news-2026-08.json | /data/archive/index.json */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const rel = parts.join("/");
  if (!/^(news\.json|archive\/(index|news-\d{4}-\d{2})\.json)$/.test(rel)) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, rel), "utf-8");
    return new Response(raw, {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=120" },
    });
  } catch {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
