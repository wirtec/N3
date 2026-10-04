import { loadArchiveIndex, loadNews, sourcesSummary } from "@/lib/news";
import { dbStats, ensureSynced } from "@/lib/sync";

export const dynamic = "force-dynamic";

/** GET /api/stats -> dataset statistics (files + database mirror) */
export async function GET() {
  await ensureSynced();
  const [store, idx, db] = await Promise.all([loadNews(), loadArchiveIndex(), dbStats()]);
  const images = store.items.reduce((n, it) => n + it.images.length, 0);
  return Response.json({
    ok: true,
    feed: store.source,
    month: store.month,
    generated_at: store.generated_at,
    current: {
      articles: store.count,
      images,
      sources: sourcesSummary(store.items).length,
      with_persian: store.items.filter((i) => i.title.fa).length,
    },
    archive_months: idx.months.length,
    database: db,
  });
}
