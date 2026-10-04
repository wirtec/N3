import { eq, sql, count, desc } from "drizzle-orm";
import { db } from "@/db";
import { articles, syncState } from "@/db/schema";
import { loadArchiveIndex, loadArchiveMonth, loadNews, type NewsItem, type NewsStore } from "./news";

function toRow(item: NewsItem, month: string) {
  const published = new Date(item.published);
  return {
    id: item.id,
    month,
    titleEn: item.title.en ?? "",
    titleFa: item.title.fa ?? "",
    summaryEn: item.summary.en ?? "",
    summaryFa: item.summary.fa ?? "",
    contentEn: item.content.en ?? "",
    contentFa: item.content.fa ?? "",
    sourceName: item.source_name ?? "",
    domain: item.domain ?? "",
    author: item.author ?? "",
    link: item.link,
    googleLink: item.google_link ?? "",
    mainImage: item.main_image ?? null,
    images: item.images ?? [],
    descriptionLinks: item.description_links ?? [],
    wordCount: item.word_count ?? 0,
    readingMinutes: item.reading_minutes ?? 1,
    published: isNaN(published.getTime()) ? new Date() : published,
    fetchedAt: item.fetched_at ? new Date(item.fetched_at) : null,
    updatedAt: new Date(),
  };
}

/** Upsert a whole store (news.json or an archive file) into PostgreSQL. */
export async function syncStore(store: NewsStore, fileKey: string, force = false) {
  const [state] = await db.select().from(syncState).where(eq(syncState.file, fileKey));
  if (!force && state && state.generatedAt === store.generated_at && state.itemCount === store.items.length) {
    return { file: fileKey, skipped: true, upserted: 0 };
  }

  const rows = store.items.map((it) => toRow(it, store.month));
  const chunk = 50;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    if (!slice.length) continue;
    await db
      .insert(articles)
      .values(slice)
      .onConflictDoUpdate({
        target: articles.id,
        set: {
          month: sql`excluded.month`,
          titleEn: sql`excluded.title_en`,
          titleFa: sql`excluded.title_fa`,
          summaryEn: sql`excluded.summary_en`,
          summaryFa: sql`excluded.summary_fa`,
          contentEn: sql`excluded.content_en`,
          contentFa: sql`excluded.content_fa`,
          sourceName: sql`excluded.source_name`,
          domain: sql`excluded.domain`,
          author: sql`excluded.author`,
          link: sql`excluded.link`,
          googleLink: sql`excluded.google_link`,
          mainImage: sql`excluded.main_image`,
          images: sql`excluded.images`,
          descriptionLinks: sql`excluded.description_links`,
          wordCount: sql`excluded.word_count`,
          readingMinutes: sql`excluded.reading_minutes`,
          published: sql`excluded.published`,
          fetchedAt: sql`excluded.fetched_at`,
          updatedAt: new Date(),
        },
      });
  }

  await db
    .insert(syncState)
    .values({ file: fileKey, generatedAt: store.generated_at, itemCount: store.items.length, syncedAt: new Date() })
    .onConflictDoUpdate({
      target: syncState.file,
      set: { generatedAt: store.generated_at, itemCount: store.items.length, syncedAt: new Date() },
    });

  return { file: fileKey, skipped: false, upserted: rows.length };
}

/** Sync news.json + every archive file. Safe to call often (cheap when unchanged). */
export async function syncAll(force = false) {
  const results = [];
  try {
    const current = await loadNews();
    results.push(await syncStore(current, "news.json", force));
    const idx = await loadArchiveIndex();
    for (const m of idx.months) {
      if (m.month === current.month) continue;
      const store = await loadArchiveMonth(m.month);
      if (store) results.push(await syncStore(store, `archive/news-${m.month}.json`, force));
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), results };
  }
  return { ok: true, results };
}

let lastEnsure = 0;
/** Throttled background sync used by pages/API (max once per minute per process). */
export async function ensureSynced() {
  const now = Date.now();
  if (now - lastEnsure < 60_000) return;
  lastEnsure = now;
  try {
    await syncAll(false);
  } catch (err) {
    console.error("[sync] failed", err);
  }
}

export async function dbStats() {
  try {
    const [total] = await db.select({ n: count() }).from(articles);
    const perMonth = await db
      .select({ month: articles.month, n: count() })
      .from(articles)
      .groupBy(articles.month)
      .orderBy(desc(articles.month));
    const perSource = await db
      .select({ source: articles.sourceName, domain: articles.domain, n: count() })
      .from(articles)
      .groupBy(articles.sourceName, articles.domain)
      .orderBy(desc(count()))
      .limit(15);
    const states = await db.select().from(syncState);
    return { ok: true, total: total?.n ?? 0, perMonth, perSource, files: states };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
