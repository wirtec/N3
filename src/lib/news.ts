import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { desc, eq, ilike, or, sql, and } from "drizzle-orm";
import { db } from "@/db";
import { articles, syncRuns, type Article, type ImageMeta, type RelatedLink } from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Types describing public/data/news.json                              */
/* ------------------------------------------------------------------ */
export type Bilingual = { en: string | null; fa: string | null };

export type NewsItem = {
  id: string;
  title: Bilingual;
  summary: Bilingual;
  content: Bilingual;
  published_at: string;
  scraped_at: string;
  source: string | null;
  author: string | null;
  url: string | null;
  google_url: string;
  images: ImageMeta[];
  image: string | null;
  related_links: RelatedLink[];
  error?: string | null;
};

export type NewsFile = {
  name: string;
  feed: string;
  generated_at: string;
  month: string;
  count: number;
  new_this_run?: number;
  languages: string[];
  items: NewsItem[];
};

export type ArchiveIndex = {
  archives: { month: string; file: string; count: number; generated_at: string | null }[];
  updated_at: string;
};

const DATA_DIR = path.join(process.cwd(), "public", "data");
const NEWS_FILE = path.join(DATA_DIR, "news.json");

/* ------------------------------------------------------------------ */
/* File helpers                                                        */
/* ------------------------------------------------------------------ */
export async function readNewsFile(): Promise<NewsFile | null> {
  try {
    const raw = await fs.readFile(NEWS_FILE, "utf-8");
    return JSON.parse(raw) as NewsFile;
  } catch {
    return null;
  }
}

export async function readArchiveIndex(): Promise<ArchiveIndex> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "archive", "index.json"), "utf-8");
    return JSON.parse(raw) as ArchiveIndex;
  } catch {
    // build the index on the fly from the directory listing
    try {
      const files = await fs.readdir(path.join(DATA_DIR, "archive"));
      const archives = [];
      for (const f of files.filter((f) => /^news-\d{4}-\d{2}\.json$/.test(f)).sort().reverse()) {
        const data = JSON.parse(await fs.readFile(path.join(DATA_DIR, "archive", f), "utf-8")) as NewsFile;
        archives.push({ month: f.slice(5, 12), file: `archive/${f}`, count: data.count ?? data.items.length, generated_at: data.generated_at ?? null });
      }
      return { archives, updated_at: new Date().toISOString() };
    } catch {
      return { archives: [], updated_at: new Date().toISOString() };
    }
  }
}

export async function readArchiveMonth(month: string): Promise<NewsFile | null> {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "archive", `news-${month}.json`), "utf-8");
    return JSON.parse(raw) as NewsFile;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */
export function rowToItem(a: Article): NewsItem {
  return {
    id: a.id,
    title: { en: a.titleEn, fa: a.titleFa },
    summary: { en: a.summaryEn, fa: a.summaryFa },
    content: { en: a.contentEn, fa: a.contentFa },
    published_at: a.publishedAt.toISOString(),
    scraped_at: a.scrapedAt.toISOString(),
    source: a.source,
    author: a.author,
    url: a.url,
    google_url: a.googleUrl,
    images: a.images ?? [],
    image: a.image,
    related_links: a.relatedLinks ?? [],
  };
}

function safeDate(v: string | null | undefined): Date {
  const d = v ? new Date(v) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/* ------------------------------------------------------------------ */
/* Sync news.json -> PostgreSQL                                        */
/* ------------------------------------------------------------------ */
export async function syncFromJson(data: NewsFile, sourceFile = "public/data/news.json") {
  let imported = 0;
  for (const it of data.items) {
    if (!it?.id) continue;
    const publishedAt = safeDate(it.published_at);
    await db
      .insert(articles)
      .values({
        id: it.id,
        titleEn: it.title?.en ?? "",
        titleFa: it.title?.fa ?? null,
        summaryEn: it.summary?.en ?? null,
        summaryFa: it.summary?.fa ?? null,
        contentEn: it.content?.en ?? null,
        contentFa: it.content?.fa ?? null,
        source: it.source ?? null,
        author: it.author ?? null,
        url: it.url ?? null,
        googleUrl: it.google_url,
        image: it.image ?? it.images?.[0]?.url ?? null,
        images: it.images ?? [],
        relatedLinks: it.related_links ?? [],
        month: data.month ?? publishedAt.toISOString().slice(0, 7),
        publishedAt,
        scrapedAt: safeDate(it.scraped_at),
      })
      .onConflictDoUpdate({
        target: articles.id,
        set: {
          titleFa: it.title?.fa ?? null,
          summaryFa: it.summary?.fa ?? null,
          contentEn: it.content?.en ?? null,
          contentFa: it.content?.fa ?? null,
          images: it.images ?? [],
          image: it.image ?? it.images?.[0]?.url ?? null,
          relatedLinks: it.related_links ?? [],
        },
      });
    imported++;
  }
  await db.insert(syncRuns).values({
    id: Math.random().toString(36).slice(2, 14) + Date.now().toString(36),
    sourceFile,
    imported: String(imported),
  });
  return imported;
}

export async function syncFromFileOrUrl(url?: string) {
  if (url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
    const data = (await res.json()) as NewsFile;
    return { imported: await syncFromJson(data, url), source: url };
  }
  const data = await readNewsFile();
  if (!data) return { imported: 0, source: "public/data/news.json (missing)" };
  return { imported: await syncFromJson(data), source: "public/data/news.json" };
}

/* ------------------------------------------------------------------ */
/* Queries (DB first, fallback to JSON file)                           */
/* ------------------------------------------------------------------ */
let bootstrapped = false;
async function ensureBootstrapped() {
  if (bootstrapped) return;
  try {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(articles);
    if (n === 0) {
      const file = await readNewsFile();
      if (file?.items?.length) await syncFromJson(file);
    }
    bootstrapped = true;
  } catch {
    /* DB unavailable – will fallback to file */
  }
}

export type ListOptions = { limit?: number; offset?: number; q?: string; month?: string; source?: string };

export async function listNews(opts: ListOptions = {}): Promise<{ items: NewsItem[]; total: number; meta: Partial<NewsFile> }> {
  const limit = Math.min(Math.max(opts.limit ?? 60, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const file = await readNewsFile();
  const meta: Partial<NewsFile> = file ? { name: file.name, feed: file.feed, generated_at: file.generated_at, month: file.month, languages: file.languages } : {};

  try {
    await ensureBootstrapped();
    const conds = [];
    if (opts.q) {
      const like = `%${opts.q}%`;
      conds.push(or(ilike(articles.titleEn, like), ilike(articles.titleFa, like), ilike(articles.summaryEn, like), ilike(articles.summaryFa, like)));
    }
    if (opts.month) conds.push(eq(articles.month, opts.month));
    if (opts.source) conds.push(ilike(articles.source, `%${opts.source}%`));
    const where = conds.length ? and(...conds) : undefined;
    const rows = await db.select().from(articles).where(where).orderBy(desc(articles.publishedAt)).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(articles).where(where);
    if (rows.length || !file) return { items: rows.map(rowToItem), total, meta };
  } catch {
    /* fallthrough */
  }

  // file fallback
  let items = file?.items ?? [];
  if (opts.q) {
    const q = opts.q.toLowerCase();
    items = items.filter((i) => [i.title.en, i.title.fa, i.summary.en, i.summary.fa].some((t) => t?.toLowerCase().includes(q)));
  }
  if (opts.source) items = items.filter((i) => i.source?.toLowerCase().includes(opts.source!.toLowerCase()));
  return { items: items.slice(offset, offset + limit), total: items.length, meta };
}

export async function getNewsItem(id: string): Promise<NewsItem | null> {
  try {
    await ensureBootstrapped();
    const [row] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    if (row) return rowToItem(row);
  } catch {
    /* fallthrough */
  }
  const file = await readNewsFile();
  const hit = file?.items.find((i) => i.id === id);
  if (hit) return hit;
  // search archives
  const idx = await readArchiveIndex();
  for (const a of idx.archives) {
    const data = await readArchiveMonth(a.month);
    const found = data?.items.find((i) => i.id === id);
    if (found) return found;
  }
  return null;
}

export async function listSources(): Promise<{ source: string; count: number }[]> {
  try {
    await ensureBootstrapped();
    const rows = await db
      .select({ source: articles.source, count: sql<number>`count(*)::int` })
      .from(articles)
      .groupBy(articles.source)
      .orderBy(desc(sql`count(*)`))
      .limit(30);
    return rows.filter((r) => r.source).map((r) => ({ source: r.source!, count: r.count }));
  } catch {
    const file = await readNewsFile();
    const map = new Map<string, number>();
    file?.items.forEach((i) => i.source && map.set(i.source, (map.get(i.source) ?? 0) + 1));
    return [...map.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  }
}
