import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getNewsItem, listNews } from "@/lib/news";
import { getLang } from "@/lib/lang";
import { t, pick, formatDate, timeAgo, type Lang } from "@/lib/i18n";
import { Gallery } from "@/components/Gallery";
import { SafeImage } from "@/components/SafeImage";
import { NewsCard } from "@/components/NewsCard";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type Search = Promise<{ both?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const item = await getNewsItem(id);
  if (!item) return { title: "Not found · NOVA" };
  return {
    title: `${item.title.en ?? item.title.fa} · NOVA`,
    description: item.summary.en ?? undefined,
    openGraph: { images: item.image ? [item.image] : [] },
  };
}

export default async function ArticlePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { id } = await params;
  const { both } = await searchParams;
  const lang = await getLang();
  const d = t(lang);
  const item = await getNewsItem(id);
  if (!item) notFound();

  const showBoth = both === "1";
  const title = pick(lang, item.title);
  const hero = item.image ?? item.images?.[0]?.url ?? null;
  const { items: more } = await listNews({ limit: 4 });
  const related = more.filter((m) => m.id !== item.id).slice(0, 3);

  return (
    <article className="space-y-10">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-cyan-200">
          {lang === "fa" ? "→" : "←"} {d.backHome}
        </Link>
        <span>·</span>
        <a href={`/api/news/${item.id}`} target="_blank" rel="noreferrer" className="font-mono text-cyan-300/80 hover:text-cyan-200">
          /api/news/{item.id} ↗
        </a>
      </nav>

      {/* Hero */}
      <header className="glass neon-border scanline relative overflow-hidden rounded-[2rem]">
        <div className="relative aspect-[16/8] w-full">
          <SafeImage src={hero} alt={title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04050f] via-[#04050f]/50 to-transparent" />
        </div>
        <div className="relative -mt-32 space-y-4 p-6 md:-mt-44 md:p-10">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {item.source && (
              <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 font-semibold text-cyan-100">{item.source}</span>
            )}
            <span className="rounded-full bg-white/5 px-3 py-1 text-slate-300">
              {d.published}: {formatDate(item.published_at, lang)} · {timeAgo(item.published_at, lang)}
            </span>
            {item.author && <span className="rounded-full bg-white/5 px-3 py-1 text-slate-300">{d.by}: {item.author}</span>}
          </div>
          <h1 className="max-w-4xl text-3xl font-black leading-tight text-white md:text-5xl">{title}</h1>
          {showBoth ? null : (
            <p className="max-w-3xl text-base leading-8 text-slate-300">{pick(lang, item.summary)}</p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2 text-sm font-bold text-[#04050f] shadow-[0_10px_30px_rgba(110,231,255,0.3)] transition hover:scale-105"
              >
                {d.original} ↗
              </a>
            )}
            <Link
              href={showBoth ? `/news/${item.id}` : `/news/${item.id}?both=1`}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {showBoth ? (lang === "fa" ? "فقط فارسی" : "English only") : d.showBoth}
            </Link>
          </div>
        </div>
      </header>

      {/* Gallery */}
      {item.images.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.3em] text-cyan-100">
            {d.gallery} <span className="text-slate-500">({item.images.length})</span>
          </h2>
          <Gallery images={item.images} title={title} />
        </section>
      )}

      {/* Body */}
      <section className={`grid gap-8 ${showBoth ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {showBoth ? (
          <>
            <Body lang="fa" text={item.content.fa} title={item.title.fa} label={d.persianVersion} fallback={d.notTranslated} />
            <Body lang="en" text={item.content.en} title={item.title.en} label={d.englishVersion} fallback={d.noText} />
          </>
        ) : (
          <div className="lg:col-span-2">
            <Body
              lang={lang}
              text={lang === "fa" ? item.content.fa : item.content.en}
              title={title}
              label={lang === "fa" ? d.persianVersion : d.englishVersion}
              fallback={lang === "fa" ? (item.content.en ? d.notTranslated : d.noText) : d.noText}
              secondary={lang === "fa" && !item.content.fa ? item.content.en : null}
            />
          </div>
        )}

        {!showBoth && (
          <aside className="space-y-6">
            <div className="glass rounded-3xl p-5">
              <h3 className="font-display mb-3 text-xs font-bold uppercase tracking-[0.3em] text-cyan-100">{d.related}</h3>
              {item.related_links.length === 0 ? (
                <p className="text-sm text-slate-500">—</p>
              ) : (
                <ul className="space-y-3">
                  {item.related_links.map((rl, i) => (
                    <li key={rl.url + i}>
                      <a href={rl.url} target="_blank" rel="noreferrer" className="group block rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-cyan-300/40 hover:bg-white/[0.06]">
                        <p className="text-sm font-semibold leading-6 text-white group-hover:text-cyan-200">
                          {lang === "fa" ? rl.title_fa || rl.title : rl.title}
                        </p>
                        {lang === "fa" && rl.title_fa && <p className="mt-1 text-xs text-slate-500" dir="ltr">{rl.title}</p>}
                        <p className="mt-1 text-[11px] text-cyan-300/70">{rl.source ?? new URL(rl.url).hostname} ↗</p>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass rounded-3xl p-5 text-xs text-slate-400">
              <h3 className="font-display mb-3 text-xs font-bold uppercase tracking-[0.3em] text-cyan-100">Metadata</h3>
              <dl className="space-y-2" dir="ltr">
                <Row k="id" v={item.id} />
                <Row k={d.scraped} v={formatDate(item.scraped_at, lang)} />
                <Row k="url" v={item.url ?? "—"} link />
                <Row k="google" v={item.google_url} link />
              </dl>
            </div>
          </aside>
        )}
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="font-display mb-5 text-sm font-bold uppercase tracking-[0.3em] text-cyan-100">{d.latest}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r, i) => (
              <NewsCard key={r.id} item={r} lang={lang} d={d} index={i} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Body({ lang, text, title, label, fallback, secondary }: { lang: Lang; text: string | null; title: string | null; label: string; fallback: string; secondary?: string | null }) {
  const paragraphs = (text ?? "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="glass rounded-3xl p-6 md:p-8" dir={lang === "fa" ? "rtl" : "ltr"} lang={lang}>
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-300 pulse-dot" />
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100">{label}</span>
      </div>
      {title && <h2 className="mb-5 text-xl font-bold text-white">{title}</h2>}
      {paragraphs.length === 0 ? (
        <>
          <p className="text-sm text-amber-200/80">{fallback}</p>
          {secondary && (
            <div className="prose-space mt-6 border-t border-white/10 pt-6" dir="ltr" lang="en">
              {secondary.split(/\n+/).filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="prose-space">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ k, v, link = false }: { k: string; v: string; link?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 text-slate-500">{k}</dt>
      <dd className="break-all">
        {link && v.startsWith("http") ? (
          <a href={v} target="_blank" rel="noreferrer" className="text-cyan-300/80 hover:text-cyan-200">
            {v.length > 70 ? v.slice(0, 70) + "…" : v}
          </a>
        ) : (
          v
        )}
      </dd>
    </div>
  );
}
