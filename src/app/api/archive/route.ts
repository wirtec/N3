import { readArchiveIndex, readNewsFile } from "@/lib/news";
import { CORS } from "@/lib/shape";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: CORS });
}

/** GET /api/archive – list of monthly archive files + current month */
export async function GET() {
  const [idx, current] = await Promise.all([readArchiveIndex(), readNewsFile()]);
  return Response.json(
    {
      ok: true,
      current: current
        ? { month: current.month, count: current.count, generated_at: current.generated_at, file: "news.json", url: "/data/news.json", api: "/api/news" }
        : null,
      archives: idx.archives.map((a) => ({ ...a, url: `/data/${a.file}`, api: `/api/archive/${a.month}` })),
      updated_at: idx.updated_at,
    },
    { headers: CORS },
  );
}
