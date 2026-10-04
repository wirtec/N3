import Link from "next/link";
import { listNews, listSources } from "@/lib/news";
import { getLang } from "@/lib/lang";
import { t, formatDate } from "@/lib/i18n";
import { NewsCard } from "@/components/NewsCard";

export const dynamic = "force-dynamic";

type Search = Promise<{ q?: string; source?: string }>;

export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const { q = "", source = "" } = await searchParams;
  const lang = await getLang();
  const d = t(lang);
  const [{ items, total, meta }, sources] = await Promise.all([listNews({ q, source, limit: 90 }), listSources()]);
  const filtering = Boolean(q || source);
  const [featured, ...rest] = filtering ? [undefined, ...items] : items;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] px-6 py-10 text-center md:py-14">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="orbit-ring left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-40" />
          <div className="orbit-ring left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 opacity-20 [animation-direction:reverse]" />
        </div>
        <p className="font-display text-[11px] uppercase tracking-[0.5em] text-cyan-200/70">Google News · Technology · EN / FA</p>
        <h1 className="font-display neon-text mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
          {lang === "fa" ? "اخبار فناوری از مدار زمین" : "TECH NEWS FROM ORBIT"}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 md:text-lg">{d.tagline}</p>

        <form className="mx-auto mt-8 flex max-w-2xl items-center gap-2" action="/" method="get">
          {source && <input type="hidden" name="source" value={source} />}
          <div className="glass neon-border flex flex-1 items-center gap-3 rounded-full px-5 py-3">
            <span className="text-cyan-300">◎</span>
            <input
              name="q"
              defaultValue={q}
              placeholder={d.search}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <button className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-3 text-sm font-bold text-[#04050f] shadow-[0_10px_30px_rgba(110,231,255,0.3)] transition hover:scale-105">
            {lang === "fa" ? "جستجو" : "Scan"}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Stat label={d.items} value={String(total)} />
          {meta.generated_at && <Stat label={d.updated} value={formatDate(meta.generated_at, lang)} />}
          <a href="/data/news.json" target="_blank" rel="noreferrer" className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-mono text-emerald-200 transition hover:bg-emerald-400/20">
            {d.liveEndpoint}: /data/news.json ↗
          </a>
        </div>
      </section>

      {/* Sources filter */}
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="me-1 text-slate-400">{d.sources}:</span>
          <Chip href={q ? `/?q=${encodeURIComponent(q)}` : "/"} active={!source}>
            {d.all}
          </Chip>
          {sources.slice(0, 14).map((s) => (
            <Chip key={s.source} href={`/?source=${encodeURIComponent(s.source)}${q ? `&q=${encodeURIComponent(q)}` : ""}`} active={source === s.source}>
              {s.source} <span className="opacity-60">({s.count})</span>
            </Chip>
          ))}
        </div>
      )}

      {featured && <NewsCard item={featured} lang={lang} d={d} featured />}

      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-[0.3em] text-cyan-100">{d.latest}</h2>
          <span className="text-xs text-slate-500">{items.length} / {total}</span>
        </div>

        {items.length === 0 ? (
          <div className="glass rounded-3xl p-14 text-center text-slate-300">
            <p className="text-3xl">🛰️</p>
            <p className="mt-3">{d.noResults}</p>
            <Link href="/" className="mt-4 inline-block text-cyan-300 underline-offset-4 hover:underline">
              {d.backHome}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.filter(Boolean).map((item, i) => (
              <NewsCard key={item!.id} item={item!} lang={lang} d={d} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="glass rounded-full px-3 py-1 text-slate-300">
      <span className="text-slate-500">{label}: </span>
      <span className="font-semibold text-white">{value}</span>
    </span>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 transition ${
        active ? "border-cyan-300/60 bg-cyan-300/15 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/40 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
