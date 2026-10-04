import { loadArchiveIndex, loadNews } from "@/lib/news";

export const dynamic = "force-dynamic";

/** GET /api/archive -> list of archived months + current month */
export async function GET() {
  const [current, idx] = await Promise.all([loadNews(), loadArchiveIndex()]);
  return Response.json({
    ok: true,
    current: {
      month: current.month,
      count: current.count,
      generated_at: current.generated_at,
      file: "news.json",
      api: `/api/news`,
    },
    months: idx.months.map((m) => ({
      ...m,
      api: `/api/archive/${m.month}`,
      raw: `/data/${m.file}`,
    })),
  });
}
