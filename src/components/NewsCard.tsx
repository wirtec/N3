import Link from "next/link";
import type { Lang, NewsItem } from "@/lib/news";
import { t, timeAgo } from "@/lib/i18n";
import { SmartImage } from "./SmartImage";

export function SourceBadge({ item }: { item: NewsItem }) {
  const domain = item.domain || item.source_name;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-slate-200 backdrop-blur">
      {domain && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
          alt=""
          width={14}
          height={14}
          className="rounded-sm"
        />
      )}
      {item.source_name || domain}
    </span>
  );
}

export function NewsCard({ item, lang, index = 0 }: { item: NewsItem; lang: Lang; index?: number }) {
  const d = t(lang);
  const title = item.title[lang] || item.title.en;
  const summary = item.summary[lang] || item.summary.en;
  const img = item.main_image || item.images[0];
  return (
    <article
      className="card fade-up flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-panel/80"
      style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
    >
      <Link href={`/${lang}/news/${item.id}`} className="relative block aspect-[16/10] overflow-hidden bg-ink">
        <SmartImage src={img} alt={title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent" />
        <div className="absolute start-3 top-3 flex gap-2">
          <SourceBadge item={item} />
        </div>
        {item.images.length > 1 && (
          <span className="absolute bottom-3 end-3 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] text-neon backdrop-blur">
            {d.photos(item.images.length)}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="text-neon">{timeAgo(item.published, lang)}</span>
          <span>·</span>
          <span>{d.readTime(item.reading_minutes)}</span>
        </div>
        <h3 className="font-display text-lg font-semibold leading-snug text-white">
          <Link href={`/${lang}/news/${item.id}`} className="hover:text-neon">
            {title}
          </Link>
        </h3>
        {summary && <p className="line-clamp-3 text-sm leading-relaxed text-slate-400">{summary}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <Link href={`/${lang}/news/${item.id}`} className="text-sm font-semibold text-violet hover:text-neon">
            {d.readMore} {lang === "fa" ? "←" : "→"}
          </Link>
          {item.description_links.length > 1 && (
            <span className="text-[11px] text-slate-500">
              +{item.description_links.length - 1} {lang === "fa" ? "منبع" : "sources"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function CompactCard({ item, lang, rank }: { item: NewsItem; lang: Lang; rank: number }) {
  const title = item.title[lang] || item.title.en;
  const img = item.main_image || item.images[0];
  return (
    <Link
      href={`/${lang}/news/${item.id}`}
      className="group flex items-start gap-3 rounded-xl p-2 transition hover:bg-white/5"
    >
      <span className="font-display w-7 shrink-0 text-2xl font-bold leading-none text-neon-gradient">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-200 group-hover:text-white">{title}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {item.source_name} · {timeAgo(item.published, lang)}
        </p>
      </div>
      {img && (
        <span className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-ink">
          <SmartImage src={img} alt="" className="h-full w-full object-cover" />
        </span>
      )}
    </Link>
  );
}
