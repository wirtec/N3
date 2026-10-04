import Link from "next/link";
import { notFound } from "next/navigation";
import { readArchiveMonth } from "@/lib/news";
import { getLang } from "@/lib/lang";
import { t, formatDate } from "@/lib/i18n";
import { NewsCard } from "@/components/NewsCard";

export const dynamic = "force-dynamic";

export default async function ArchiveMonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const lang = await getLang();
  const d = t(lang);
  const data = await readArchiveMonth(month);
  if (!data) notFound();

  return (
    <div className="space-y-8">
      <nav className="text-xs text-slate-400">
        <Link href="/archive" className="hover:text-cyan-200">
          {lang === "fa" ? "→" : "←"} {d.archive}
        </Link>
      </nav>
      <header>
        <p className="font-display text-[11px] uppercase tracking-[0.3em] text-violet-300">◆ ARCHIVE</p>
        <h1 className="font-display neon-text mt-2 text-4xl font-black md:text-6xl">{month}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {data.count} {d.items} · {formatDate(data.generated_at, lang)} ·{" "}
          <a href={`/api/archive/${month}`} className="font-mono text-cyan-300/80 hover:text-cyan-200" target="_blank" rel="noreferrer" dir="ltr">
            /api/archive/{month} ↗
          </a>
        </p>
      </header>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item, i) => (
          <NewsCard key={item.id} item={item} lang={lang} d={d} index={i} />
        ))}
      </div>
    </div>
  );
}
