import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { NewsCard } from "@/components/NewsCard";
import { filterItems, isLang, loadArchiveMonth } from "@/lib/news";
import { formatDate, monthLabel, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function ArchiveMonthPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; month: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { lang, month } = await params;
  if (!isLang(lang)) notFound();
  const store = await loadArchiveMonth(month);
  if (!store) notFound();
  const sp = await searchParams;
  const d = t(lang);
  const q = sp.q?.trim() ?? "";
  const items = filterItems(store.items, { q });
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Header lang={lang} path={`/archive/${month}`} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav className="mt-6 text-xs text-slate-500">
          <Link href={`/${lang}/archive`} className="hover:text-neon">
            {d.archiveTitle}
          </Link>{" "}
          / <span className="text-slate-300">{month}</span>
        </nav>
        <h1 className="font-display mt-4 text-4xl font-bold text-neon-gradient">{monthLabel(month, lang)}</h1>
        <p className="mt-2 font-mono text-xs text-slate-500">
          {d.items(store.count)} · {d.updated}: {formatDate(store.generated_at, lang)}
          {store.archived_at ? ` · archived ${formatDate(store.archived_at, lang)}` : ""}
          {" · "}
          <Link href={`/api/archive/${month}`} className="text-neon/80 hover:underline">
            /api/archive/{month}
          </Link>
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {slice.map((it, i) => (
            <NewsCard key={it.id} item={it} lang={lang} index={i} />
          ))}
        </div>

        {pages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3 font-mono text-sm">
            {page > 1 && (
              <Link href={`/${lang}/archive/${month}?page=${page - 1}`} className="rounded-lg border border-white/10 px-4 py-2 hover:border-neon">
                {d.prev}
              </Link>
            )}
            <span className="text-slate-400">
              {d.page} {page} / {pages}
            </span>
            {page < pages && (
              <Link href={`/${lang}/archive/${month}?page=${page + 1}`} className="rounded-lg border border-white/10 px-4 py-2 hover:border-neon">
                {d.next}
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  );
}
