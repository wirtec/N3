import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";

export const metadata: Metadata = {
  title: "NOVA · Tech News from orbit",
  description:
    "Bilingual (EN/FA) technology news scraped hourly from Google News with Python + GitHub Actions.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  const d = t(lang);

  return (
    <html lang={lang} dir={d.dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Space+Grotesk:wght@400;500;700&family=Vazirmatn:wght@300;400;600;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <div className="space-bg" />
        <div className="stars" />
        <div className="stars2" />
        <div className="stars3" />
        <div className="grid-floor" />
        <div className="planet planet-a" />
        <div className="planet planet-b" />

        <header className="sticky top-0 z-40">
          <div className="glass border-x-0 border-t-0">
            <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <Link href="/" className="group flex items-center gap-3">
                <span className="hologram relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 ring-1 ring-cyan-300/40">
                  <span className="h-3 w-3 rounded-full bg-cyan-300 pulse-dot" />
                  <span className="orbit-ring h-9 w-9" />
                </span>
                <span className="leading-none">
                  <span className="font-display neon-text block text-xl font-black">{d.brand}</span>
                  <span className="block text-[10px] uppercase tracking-[0.35em] text-cyan-200/70">{d.brandSub}</span>
                </span>
              </Link>

              <div className="hidden items-center gap-1 text-sm md:flex">
                <NavLink href="/">{d.home}</NavLink>
                <NavLink href="/archive">{d.archive}</NavLink>
                <NavLink href="/docs">{d.api}</NavLink>
                <a
                  href="/api/news"
                  className="rounded-full px-3 py-1.5 text-cyan-200/80 transition hover:bg-white/5 hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  /api/news ↗
                </a>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1 text-[11px] text-cyan-100/80 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
                  {d.hourly}
                </span>
                <LangToggle lang={lang} label={d.lang} />
              </div>
            </nav>
            <div className="flex gap-1 px-4 pb-2 text-xs md:hidden">
              <NavLink href="/">{d.home}</NavLink>
              <NavLink href="/archive">{d.archive}</NavLink>
              <NavLink href="/docs">{d.api}</NavLink>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6">{children}</main>

        <footer className="relative z-10 mt-10 border-t border-white/5 py-10 text-center text-xs text-[var(--muted)]">
          <p>{d.poweredBy}</p>
          <p className="mt-2 font-mono text-[11px] text-cyan-200/50">
            /api/news · /api/news/:id · /api/archive · /api/archive/:month · /data/news.json
          </p>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-full px-3 py-1.5 text-slate-200/80 transition hover:bg-white/5 hover:text-white">
      {children}
    </Link>
  );
}
