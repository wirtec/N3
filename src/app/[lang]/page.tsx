import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Ticker } from "@/components/Ticker";
import { CompactCard, NewsCard, SourceBadge } from "@/components/NewsCard";
import { SmartImage } from "@/components/SmartImage";
import { filterItems, isLang, loadNews, sourcesSummary } from "@/lib/news";
import { formatDate, monthLabel, t, timeAgo } from "@/lib/i18n";
import { ensureSynced } from "@/lib/sync";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 18;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; source?: string; page?: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const sp = await searchParams;
  const d = t(lang);
  void ensureSynced();

  const store = await loadNews();
  const q = sp.q?.trim() ?? "";
  const source = sp.source?.trim() ?? "";
  const filtering = Boolean(q || source);
  const items = filterItems(store.items, { q, source });
  const sources = sourcesSummary(store.items);
  const totalImages = store.items.reduce((n, i) => n + i.images.length, 0);

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const hero = !filtering ? items[0] : undefined;
  const trending = !filtering ? items.slice(1, 6) : [];
  const rest = filtering ? items : items.slice(6);
  const pages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const pageItems = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (source) u.set("source", source);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/${lang}${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <Header lang={lang} />
      <Ticker items={store.items} lang={lang} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Stats strip */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_10px_#a3ff5b]" />
            {d.updated}: {store.generated_at ? formatDate(store.generated_at, lang) : "—"}
          </span>
          <span>
            {d.stats.articles}: <b className="text-neon">{store.count}</b>
          </span>
          <span>
            {d.stats.images}: <b className="text-violet">{totalImages}</b>
          </span>
          <span>
            {d.stats.sources}: <b className="text-magenta">{sources.length}</b>
          </span>
          <span>
            {d.stats.month}: <b className="text-amber">{monthLabel(store.month, lang)}</b>
          </span>
        </div>

        {store.items.length === 0 && (
          <div className="glass mt-10 rounded-2xl p-10 text-center text-slate-300">
            <p className="text-lg">{d.empty}</p>
            <Link href={`/${lang}/docs`} className="mt-4 inline-block text-neon underline">
              {d.nav.api}
            </Link>
          </div>
        )}

        {/* Hero */}
        {hero && (
          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            <Link
              href={`/${lang}/news/${hero.id}`}
              className="card scanline group relative col-span-2 block min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-panel lg:min-h-[520px]"
            >
              <SmartImage
                src={hero.main_image || hero.images[0]}
                alt={hero.title[lang] || hero.title.en}
                loading="eager"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gradient-to-r from-neon to-violet px-3 py-1 font-display text-[11px] font-bold uppercase tracking-widest text-void">
                    {d.featured}
                  </span>
                  <SourceBadge item={hero} />
                  <span className="text-xs text-slate-300">{timeAgo(hero.published, lang)}</span>
                </div>
                <h1 className="font-display max-w-3xl text-3xl font-bold leading-tight text-white drop-shadow sm:text-4xl lg:text-5xl">
                  {hero.title[lang] || hero.title.en}
                </h1>
                <p className="mt-4 line-clamp-2 max-w-2xl text-slate-300 sm:text-lg">
                  {hero.summary[lang] || hero.summary.en}
                </p>
                <div className="mt-5 flex items-center gap-4 text-xs text-slate-400">
                  <span>{d.readTime(hero.reading_minutes)}</span>
                  {hero.images.length > 0 && <span>{d.photos(hero.images.length)}</span>}
                  <span className="ms-auto font-semibold text-neon group-hover:underline">{d.readMore} {lang === "fa" ? "←" : "→"}</span>
                </div>
              </div>
            </Link>

            <aside className="glass flex flex-col rounded-3xl p-4">
              <h2 className="font-display mb-2 flex items-center gap-2 px-2 text-sm font-bold uppercase tracking-widest text-slate-300">
                <span className="pulse-dot h-2 w-2 rounded-full bg-magenta" />
                {d.latest}
              </h2>
              <div className="flex flex-col divide-y divide-white/5">
                {trending.map((it, i) => (
                  <CompactCard key={it.id} item={it} lang={lang} rank={i + 2} />
                ))}
              </div>
              <div className="mt-auto pt-4">
                <p className="mb-2 px-2 text-[11px] uppercase tracking-widest text-slate-500">{d.sourcesTitle}</p>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {sources.slice(0, 10).map((s) => (
                    <Link
                      key={s.domain || s.name}
                      href={`/${lang}?source=${encodeURIComponent(s.domain || s.name)}`}
                      className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 transition hover:border-neon/50 hover:text-neon"
                    >
                      {s.name} <span className="text-slate-500">{s.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        )}

        {/* Grid */}
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-white">
              {filtering ? (
                <>
                  {q ? d.searchResults(items.length, q) : `${source} · ${d.items(items.length)}`}
                </>
              ) : (
                <span className="text-neon-gradient">{d.moreStories}</span>
              )}
            </h2>
            {filtering && (
              <Link href={`/${lang}`} className="text-sm text-slate-400 hover:text-neon">
                {d.filterAll} ✕
              </Link>
            )}
          </div>

          {pageItems.length === 0 && filtering && (
            <div className="glass rounded-2xl p-10 text-center text-slate-400">—</div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((it, i) => (
              <NewsCard key={it.id} item={it} lang={lang} index={i} />
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3 font-mono text-sm">
              {page > 1 ? (
                <Link href={qs(page - 1)} className="rounded-lg border border-white/10 px-4 py-2 hover:border-neon hover:text-neon">
                  {d.prev}
                </Link>
              ) : (
                <span className="rounded-lg border border-white/5 px-4 py-2 text-slate-600">{d.prev}</span>
              )}
              <span className="text-slate-400">
                {d.page} {page} / {pages}
              </span>
              {page < pages ? (
                <Link href={qs(page + 1)} className="rounded-lg border border-white/10 px-4 py-2 hover:border-neon hover:text-neon">
                  {d.next}
                </Link>
              ) : (
                <span className="rounded-lg border border-white/5 px-4 py-2 text-slate-600">{d.next}</span>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
