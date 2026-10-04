"use client";

import { useTransition } from "react";
import { setLanguage } from "@/app/actions";
import type { Lang } from "@/lib/i18n";

export function LangToggle({ lang, label }: { lang: Lang; label: string }) {
  const [pending, start] = useTransition();
  const next: Lang = lang === "fa" ? "en" : "fa";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setLanguage(next))}
      className="neon-border relative inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
      aria-label="Switch language"
    >
      <span className={`h-2 w-2 rounded-full ${pending ? "animate-ping bg-fuchsia-400" : "bg-cyan-300"}`} />
      {label}
    </button>
  );
}
