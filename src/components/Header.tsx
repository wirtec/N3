import Link from "next/link";
import type { Lang } from "@/lib/news";
import { t } from "@/lib/i18n";
import { SearchBox } from "./SearchBox";

export function Header({ lang, path = "" }: { lang: Lang; path?: string }) {
  const d = t(lang);
  const other: Lang = lang === "fa" ? "en" : "fa";
  const nav = [
    { href: `/${lang}`, label: d.nav.home },
    { href: `/${lang}/archive`, label: d.nav.archive },
    { href: `/${lang}/docs`, label: d.nav.api },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-void/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href={`/${lang}`} className="group flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-neon via-violet to-magenta shadow-[0_0_30px_-5px_rgba(34,227,255,0.6)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-void" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l3-8 4 16 3-8h4" />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-tight text-white">{d.siteName}</span>
            <span className="mt-1 hidden text-[10px] uppercase tracking-[0.25em] text-neon/80 sm:block">
              {lang === "fa" ? "اخبار فناوری" : "technology wire"}
            </span>
          </span>
        </Link>

        <nav className="ms-4 hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <SearchBox lang={lang} placeholder={d.search} />
          <Link
            href={`/${other}${path}`}
            hrefLang={other}
            className="rounded-lg border border-neon/30 bg-neon/10 px-3 py-2 text-sm font-semibold text-neon transition hover:bg-neon/20"
          >
            {d.switchLang}
          </Link>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Footer({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    <footer className="mt-20 border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl">{d.footer}</p>
        <div className="flex gap-4 font-mono text-xs">
          <Link href="/api/news" className="hover:text-neon">/api/news</Link>
          <Link href="/data/news.json" className="hover:text-neon">news.json</Link>
          <Link href={`/api/feed?lang=${lang}`} className="hover:text-neon">RSS</Link>
        </div>
      </div>
    </footer>
  );
}
