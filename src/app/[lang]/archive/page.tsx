import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { isLang, loadArchiveIndex, loadNews } from "@/lib/news";
import { formatDate, monthLabel, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ArchivePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = t(lang);
  const [current, idx] = await Promise.all([loadNews(), loadArchiveIndex()]);
  const months = idx.months.filter((m) => m.month !== current.month);

  return (
    <>
      <Header lang={lang} path="/archive" />
      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <h1 className="font-display mt-10 text-4xl font-bold text-neon-gradient">{d.archiveTitle}</h1>
        <p className="mt-3 max-w-2xl text-slate-400">{d.archiveIntro}</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/${lang}`}
            className="card glass relative overflow-hidden rounded-2xl p-6"
          >
            <span className="absolute end-4 top-4 rounded-full bg-gradient-to-r from-neon to-violet px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-void">
              {d.currentMonth}
            </span>
            <p className="font-mono text-xs text-slate-500">{current.month}</p>
            <h2 className="font-display mt-2 text-2xl font-bold text-white">{monthLabel(current.month, lang)}</h2>
            <p className="mt-2 text-sm text-slate-400">{d.items(current.count)}</p>
            <p className="mt-4 font-mono text-[11px] text-slate-500">
              {d.updated}: {formatDate(current.generated_at, lang)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-neon/80">news.json</p>
          </Link>

          {months.map((m) => (
            <Link key={m.month} href={`/${lang}/archive/${m.month}`} className="card glass rounded-2xl p-6">
              <p className="font-mono text-xs text-slate-500">{m.month}</p>
              <h2 className="font-display mt-2 text-2xl font-bold text-white">{monthLabel(m.month, lang)}</h2>
              <p className="mt-2 text-sm text-slate-400">{d.items(m.count)}</p>
              {m.archived_at && (
                <p className="mt-4 font-mono text-[11px] text-slate-500">
                  {formatDate(m.archived_at, lang)}
                </p>
              )}
              <p className="mt-1 font-mono text-[11px] text-violet/80">{m.file}</p>
            </Link>
          ))}
        </div>

        {months.length === 0 && (
          <p className="glass mt-8 rounded-2xl p-6 text-sm text-slate-400">
            {lang === "fa"
              ? "هنوز آرشیوی ساخته نشده است. اولین آرشیو در ابتدای ماه بعد به‌صورت خودکار ایجاد می‌شود."
              : "No archive yet. The first archive file is created automatically at the start of next month."}
          </p>
        )}
      </main>
    </>
  );
}
