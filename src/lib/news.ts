import { promises as fs } from "fs";
import path from "path";
import type { DescriptionLink } from "@/db/schema";

export type Lang = "en" | "fa";
export const LANGS: Lang[] = ["en", "fa"];
export const isLang = (v: string): v is Lang => v === "en" || v === "fa";

export type Bilingual = { en: string; fa: string };

export type NewsItem = {
  id: string;
  title: Bilingual;
  summary: Bilingual;
  content: Bilingual;
  published: string;
  fetched_at: string;
  source_name: string;
  author: string;
  google_link: string;
  link: string;
  domain: string;
  main_image: string | null;
  images: string[];
  description_links: DescriptionLink[];
  word_count: number;
  reading_minutes: number;
};

export type NewsStore = {
  source: string;
  feed_title?: string;
  month: string;
  generated_at: string;
  archived_at?: string;
  count: number;
  items: NewsItem[];
};

export type ArchiveIndex = {
  generated_at: string;
  months: { month: string; file: string; count: number; archived_at?: string | null }[];
};

export const DATA_DIR = path.join(process.cwd(), "data");
export const NEWS_FILE = path.join(DATA_DIR, "news.json");
export const ARCHIVE_DIR = path.join(DATA_DIR, "archive");

const MONTH_RE = /^\d{4}-\d{2}$/;

function emptyStore(): NewsStore {
  return {
    source: "",
    month: new Date().toISOString().slice(0, 7),
    generated_at: new Date(0).toISOString(),
    count: 0,
    items: [],
  };
}

function normalize(store: Partial<NewsStore>): NewsStore {
  const items = Array.isArray(store.items) ? store.items : [];
  return {
    ...emptyStore(),
    ...store,
    count: items.length,
    items: items.map((it) => ({
      ...it,
      title: it.title ?? { en: "", fa: "" },
      summary: it.summary ?? { en: "", fa: "" },
      content: it.content ?? { en: "", fa: "" },
      images: Array.isArray(it.images) ? it.images : [],
      description_links: Array.isArray(it.description_links) ? it.description_links : [],
    })),
  };
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Current month's news.json */
export async function loadNews(): Promise<NewsStore> {
  const data = await readJson<NewsStore>(NEWS_FILE);
  return data ? normalize(data) : emptyStore();
}

/** List of archived months (newest first). */
export async function loadArchiveIndex(): Promise<ArchiveIndex> {
  const idx = await readJson<ArchiveIndex>(path.join(ARCHIVE_DIR, "index.json"));
  if (idx?.months) return idx;
  // Fallback: scan the directory
  try {
    const files = await fs.readdir(ARCHIVE_DIR);
    const months = await Promise.all(
      files
        .filter((f) => /^news-\d{4}-\d{2}\.json$/.test(f))
        .sort()
        .reverse()
        .map(async (f) => {
          const data = await readJson<NewsStore>(path.join(ARCHIVE_DIR, f));
          return {
            month: f.replace("news-", "").replace(".json", ""),
            file: `archive/${f}`,
            count: data?.items?.length ?? 0,
            archived_at: data?.archived_at ?? null,
          };
        }),
    );
    return { generated_at: new Date().toISOString(), months };
  } catch {
    return { generated_at: new Date().toISOString(), months: [] };
  }
}

/** Load a specific archived month (YYYY-MM). Returns null if invalid/missing. */
export async function loadArchiveMonth(month: string): Promise<NewsStore | null> {
  if (!MONTH_RE.test(month)) return null;
  const current = await loadNews();
  if (current.month === month) return current;
  const data = await readJson<NewsStore>(path.join(ARCHIVE_DIR, `news-${month}.json`));
  return data ? normalize(data) : null;
}

/** Every item from the current month + all archives (deduped, newest first). */
export async function loadAllItems(): Promise<NewsItem[]> {
  const current = await loadNews();
  const idx = await loadArchiveIndex();
  const seen = new Set(current.items.map((i) => i.id));
  const all = [...current.items];
  for (const m of idx.months) {
    if (m.month === current.month) continue;
    const store = await loadArchiveMonth(m.month);
    for (const it of store?.items ?? []) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        all.push(it);
      }
    }
  }
  return all.sort((a, b) => b.published.localeCompare(a.published));
}

export async function findItem(id: string): Promise<{ item: NewsItem; month: string } | null> {
  const current = await loadNews();
  const hit = current.items.find((i) => i.id === id);
  if (hit) return { item: hit, month: current.month };
  const idx = await loadArchiveIndex();
  for (const m of idx.months) {
    const store = await loadArchiveMonth(m.month);
    const found = store?.items.find((i) => i.id === id);
    if (found) return { item: found, month: m.month };
  }
  return null;
}

/** Text search + filters over an item list. */
export function filterItems(
  items: NewsItem[],
  opts: { q?: string; source?: string; lang?: Lang; withImages?: boolean },
): NewsItem[] {
  const q = opts.q?.trim().toLowerCase();
  const source = opts.source?.trim().toLowerCase();
  return items.filter((it) => {
    if (source && !`${it.source_name} ${it.domain}`.toLowerCase().includes(source)) return false;
    if (opts.withImages && !it.main_image && it.images.length === 0) return false;
    if (q) {
      const hay = [
        it.title.en,
        it.title.fa,
        it.summary.en,
        it.summary.fa,
        it.source_name,
        it.domain,
        it.content.en.slice(0, 2000),
        it.content.fa.slice(0, 2000),
      ]
        .join(" \n ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sourcesSummary(items: NewsItem[]) {
  const map = new Map<string, { name: string; domain: string; count: number }>();
  for (const it of items) {
    const key = it.domain || it.source_name;
    const cur = map.get(key) ?? { name: it.source_name || it.domain, domain: it.domain, count: 0 };
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Pick a single language view of an item (used by the API `lang` param). */
export function localize(item: NewsItem | Omit<NewsItem, "content">, lang: Lang) {
  const content = "content" in item ? item.content : undefined;
  return {
    ...item,
    title: item.title?.[lang] || item.title?.en || "",
    summary: item.summary?.[lang] || item.summary?.en || "",
    ...(content ? { content: content[lang] || content.en || "" } : {}),
    description_links: (item.description_links ?? []).map((l) => ({
      ...l,
      title: l.title?.[lang] || l.title?.en || "",
    })),
    lang,
  };
}

export function toCard(item: NewsItem) {
  const { content, ...rest } = item;
  void content;
  return rest;
}
