import { listSources } from "@/lib/news";
import { CORS } from "@/lib/shape";

export const dynamic = "force-dynamic";

/** GET /api/sources – publishers and their article counts */
export async function GET() {
  const sources = await listSources();
  return Response.json({ ok: true, count: sources.length, sources }, { headers: CORS });
}
