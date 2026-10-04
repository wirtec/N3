import Link from "next/link";
import type { NewsItem } from "@/lib/news";
import { pick, timeAgo, type Lang, type Dict } from "@/lib/i18n";
import { TiltCard } from "./TiltCard";
import { SafeImage } from "./SafeImage";

export function NewsCard({ item, lang, d, featured = false, index = 0 }: { item: NewsItem; lang: Lang; d: Dict; featured?: boolean; index?: number }) {
  const title = pick(lang, item.title);
  const summary = pick(lang, item.summary);
  const img = item.image ?? item.images?.[0]?.url ?? null;
  const href = `/news/${item.id}`;

  if (featured) {
    return (
      <TiltCard max={5} className="fade-up overflow-hidden rounded-3xl">
        <Link href={href} className="glass neon-border scanline group relative block overflow-hidden rounded-3xl">
          <div className="grid gap-0 md:grid-cols-5">
            <div className="relative aspect-[16/10] md:col-span-3 md:aspect-auto md:min-h-[420px]">
              <SafeImage src={img} alt={title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#04050f] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#070a1f]" />
            </div>
            <div className="layer relative flex flex-col justify-center gap-4 p-6 md:col-span-2 md:p-10">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-fuchsia-200">
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300 pulse-dot" /> {d.featured}
              </span>
              <h2 className="text-2xl font-extrabold leading-snug text-white md:text-3xl">{title}</h2>
              <p className="line-clamp-4 text-sm leading-7 text-slate-300">{summary}</p>
              <Meta item={item} lang={lang} />
              <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2 text-sm font-bold text-[#04050f] shadow-[0_10px_30px_rgba(110,231,255,0.35)] transition group-hover:shadow-[0_10px_40px_rgba(167,139,250,0.55)]">
                {d.readMore} {lang === "fa" ? "←" : "→"}
              </span>
            </div>
          </div>
        </Link>
      </TiltCard>
    );
  }

  return (
    <TiltCard className="fade-up rounded-3xl" >
      <Link
        href={href}
        style={{ animationDelay: `${Math.min(index, 12) * 60}ms` }}
        className="glass neon-border group flex h-full flex-col overflow-hidden rounded-3xl"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
          <SafeImage src={img} alt={title} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04050f]/90 via-transparent to-transparent" />
          {item.images.length > 1 && (
            <span className="absolute end-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-cyan-100 backdrop-blur">
              🖼 {item.images.length} {d.imagesCount}
            </span>
          )}
          {item.source && (
            <span className="absolute bottom-3 start-3 rounded-full border border-cyan-300/30 bg-[#04050f]/70 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-200 backdrop-blur">
              {item.source}
            </span>
          )}
        </div>
        <div className="layer flex flex-1 flex-col gap-3 p-5">
          <h3 className="line-clamp-3 text-lg font-bold leading-snug text-white transition group-hover:text-cyan-200">{title}</h3>
          <p className="line-clamp-3 text-sm leading-6 text-slate-400">{summary}</p>
          <div className="mt-auto pt-2">
            <Meta item={item} lang={lang} compact />
          </div>
        </div>
      </Link>
    </TiltCard>
  );
}

function Meta({ item, lang, compact = false }: { item: NewsItem; lang: Lang; compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 ${compact ? "" : "text-sm"}`}>
      <time dateTime={item.published_at} className="text-cyan-200/80">
        ⏱ {timeAgo(item.published_at, lang)}
      </time>
      {!compact && item.source && <span>· {item.source}</span>}
      {item.related_links?.length > 0 && <span>· 🔗 {item.related_links.length}</span>}
    </div>
  );
}
