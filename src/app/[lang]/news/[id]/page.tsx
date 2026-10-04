import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Gallery } from "@/components/Gallery";
import { NewsCard, SourceBadge } from "@/components/NewsCard";
import { SmartImage } from "@/components/SmartImage";
import { findItem, isLang, loadNews, type Lang } from "@/lib/news";
import { formatDate, monthLabel, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLang(lang)) return {};
  const found = await findItem(id);
  if (!found) return {};
  const { item } = found;
  return {
    title: item.title[lang] || item.title.en,
    description: item.summary[lang] || item.summary.en,
    openGraph: { images: item.main_image ? [item.main_image] : [] },
  };
}

function Paragraphs({ text }: { text: string }) {
  const paras = text.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  const found = await findItem(id);
  if (!found) notFound();
  const { item, month } = found;
  const d = t(lang);
  const other: Lang = lang === "fa" ? "en" : "fa";

  const title = item.title[lang] || item.title.en;
  const content = item.content[lang] || item.content.en;
  const contentIsFallback = lang === "fa" && !item.content.fa && Boolean(item.content.en);
  const summary = item.summary[lang] || item.summary.en;
  const hero = item.main_image || item.images[0];
  const galleryImages = item.images.length ? item.images : hero ? [hero] : [];

  const store = await loadNews();
  const related = store.items.filter((i) => i.id !== item.id).slice(0, 3);

  return (
    <>
      <Header lang={lang} path={`/news/${item.id}`} />
      <main className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <nav className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link href={`/${lang}`} className="hover:text-neon">
            {d.nav.home}
          </Link>
          <span>/</span>
          <Link href={`/${lang}/archive/${month}`} className="hover:text-neon">
            {monthLabel(month, lang)}
          </Link>
          <span>/</span>
          <span className="truncate text-slate-400">{item.source_name}</span>
        </nav>

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge item={item} />
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">
              {d.published}: {formatDate(item.published, lang)}
            </span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">
              {d.readTime(item.reading_minutes)}
            </span>
            {item.author && (
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">
                {d.by} {item.author}
              </span>
            )}
          </div>
          <h1 className="font-display mt-5 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">{title}</h1>
          {/* The other language's title, always visible for bilingual context */}
          <p
            dir={other === "fa" ? "rtl" : "ltr"}
            className={`mt-3 text-lg text-slate-400 ${other === "fa" ? "text-right" : "text-left"}`}
            style={{ fontFamily: other === "fa" ? "var(--font-fa)" : "var(--font-display)" }}
          >
            {item.title[other]}
          </p>
          {summary && <p className="mt-5 border-s-2 border-neon/60 ps-4 text-lg leading-relaxed text-slate-300">{summary}</p>}
        </header>

        {hero && (
          <figure className="scanline relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-ink">
            <SmartImage src={hero} alt={title} loading="eager" className="max-h-[560px] w-full object-cover" />
          </figure>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_260px]">
          <article>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-md px-2 py-1 ${lang === "fa" ? "bg-violet/20 text-violet" : "bg-neon/10 text-neon"}`}>
                {lang === "fa" ? (contentIsFallback ? d.original : d.translated) : d.original}
              </span>
              <Link href={`/${other}/news/${item.id}`} className="rounded-md border border-white/10 px-2 py-1 text-slate-300 hover:border-neon hover:text-neon">
                {other === "fa" ? "مشاهده به فارسی" : "Read in English"}
              </Link>
            </div>
            {content ? (
              <div className="prose-news" dir={contentIsFallback ? "ltr" : undefined}>
                <Paragraphs text={content} />
              </div>
            ) : (
              <div className="glass rounded-2xl p-6 text-slate-300">{d.noContent}</div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon to-violet px-5 py-3 font-semibold text-void shadow-[0_10px_30px_-10px_rgba(34,227,255,0.6)] transition hover:brightness-110"
              >
                {d.originalSource} ↗
              </a>
              <a
                href={item.google_link}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-slate-300 transition hover:border-neon hover:text-neon"
              >
                {d.googleNews} ↗
              </a>
              <Link
                href={`/api/news/${item.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 font-mono text-xs text-slate-400 transition hover:border-neon hover:text-neon"
              >
                JSON
              </Link>
            </div>

            <Gallery images={galleryImages} title={title} label={d.images} />
          </article>

          <aside className="space-y-6">
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-slate-300">{d.coverage}</h3>
              <p className="mt-1 text-[11px] text-slate-500">{d.coverageHint}</p>
              <ul className="mt-4 space-y-3">
                {item.description_links.map((l, i) => (
                  <li key={l.url + i} className="group">
                    <a
                      href={l.resolved_url || l.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block rounded-lg border border-white/5 p-3 transition hover:border-neon/40 hover:bg-white/5"
                    >
                      <p className="text-sm font-medium leading-snug text-slate-200 group-hover:text-white">
                        {l.title?.[lang] || l.title?.en}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                        {l.source && (
                          <>
                            <span className="text-neon/80">{l.source}</span>
                            <span>·</span>
                          </>
                        )}
                        <span className="truncate">{(l.resolved_url || l.url).replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}</span>
                      </p>
                    </a>
                  </li>
                ))}
                {item.description_links.length === 0 && <li className="text-xs text-slate-500">—</li>}
              </ul>
            </div>

            <div className="glass rounded-2xl p-5 font-mono text-[11px] text-slate-400">
              <p>
                id: <span className="text-slate-200">{item.id}</span>
              </p>
              <p className="mt-1">
                domain: <span className="text-slate-200">{item.domain}</span>
              </p>
              <p className="mt-1">
                words: <span className="text-slate-200">{item.word_count}</span>
              </p>
              <p className="mt-1">
                images: <span className="text-slate-200">{item.images.length}</span>
              </p>
              <p className="mt-1">
                fetched: <span className="text-slate-200">{formatDate(item.fetched_at, lang)}</span>
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display mb-6 text-2xl font-bold text-neon-gradient">{d.moreStories}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((it, i) => (
                <NewsCard key={it.id} item={it} lang={lang} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
