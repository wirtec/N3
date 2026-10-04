import Link from "next/link";
import { readArchiveIndex, readNewsFile } from "@/lib/news";
import { getLang } from "@/lib/lang";
import { t, formatDate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const lang = await getLang();
  const d = t(lang);
  const [idx, current] = await Promise.all([readArchiveIndex(), readNewsFile()]);

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="font-display neon-text text-3xl font-black md:text-5xl">{d.archiveTitle}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-300">{d.archiveSub}</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/" className="glass neon-border scanline group relative overflow-hidden rounded-3xl p-6 transition hover:-translate-y-1">
          <p className="font-display text-[11px] uppercase tracking-[0.3em] text-emerald-300">● LIVE</p>
          <p className="font-display mt-3 text-3xl font-black text-white">{current?.month ?? "—"}</p>
          <p className="mt-1 text-sm text-slate-400">{d.currentMonth}</p>
          <p className="mt-4 text-sm text-slate-300">
            {current?.count ?? 0} {d.items}
          </p>
          <p className="mt-1 text-xs text-slate-500">{d.updated}: {formatDate(current?.generated_at, lang)}</p>
          <p className="mt-4 font-mono text-[11px] text-cyan-300/80" dir="ltr">/data/news.json</p>
        </Link>

        {idx.archives.map((a) => (
          <Link key={a.month} href={`/archive/${a.month}`} className="glass neon-border group relative overflow-hidden rounded-3xl p-6 transition hover:-translate-y-1">
            <p className="font-display text-[11px] uppercase tracking-[0.3em] text-violet-300">◆ ARCHIVE</p>
            <p className="font-display mt-3 text-3xl font-black text-white">{a.month}</p>
            <p className="mt-4 text-sm text-slate-300">
              {a.count} {d.items}
            </p>
            <p className="mt-1 text-xs text-slate-500">{formatDate(a.generated_at, lang)}</p>
            <p className="mt-4 font-mono text-[11px] text-cyan-300/80" dir="ltr">/data/{a.file}</p>
          </Link>
        ))}
      </div>

      {idx.archives.length === 0 && (
        <div className="glass rounded-3xl p-10 text-center text-slate-300">
          <p className="text-3xl">🪐</p>
          <p className="mt-3">{d.noArchives}</p>
        </div>
      )}
    </div>
  );
}
