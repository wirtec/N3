import Link from "next/link";
import type { Lang, NewsItem } from "@/lib/news";
import { t } from "@/lib/i18n";

export function Ticker({ items, lang }: { items: NewsItem[]; lang: Lang }) {
  const d = t(lang);
  if (!items.length) return null;
  const list = items.slice(0, 20);
  const doubled = [...list, ...list];
  return (
    <div className="relative z-10 flex items-stretch overflow-hidden border-b border-white/5 bg-ink/80 text-sm">
      <div className="relative z-10 flex shrink-0 items-center gap-2 bg-gradient-to-r from-magenta to-violet px-4 font-display text-xs font-bold uppercase tracking-widest text-white">
        <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-white" />
        {d.breaking}
      </div>
      <div className="relative flex-1 overflow-hidden py-2.5">
        <div className="ticker-track gap-10 px-5">
          {doubled.map((it, i) => (
            <Link
              key={`${it.id}-${i}`}
              href={`/${lang}/news/${it.id}`}
              className="inline-flex items-center gap-2 text-slate-300 transition hover:text-neon"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-neon/70" />
              <span>{it.title[lang] || it.title.en}</span>
              <span className="font-mono text-[10px] text-slate-500">{it.source_name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
