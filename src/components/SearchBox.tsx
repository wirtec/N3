"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Lang } from "@/lib/news";

export function SearchBox({ lang, placeholder }: { lang: Lang; placeholder: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/${lang}?q=${encodeURIComponent(query)}` : `/${lang}`);
  };

  return (
    <form onSubmit={submit} className="relative hidden sm:block">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-44 rounded-lg border border-white/10 bg-white/5 py-2 pe-3 ps-9 text-sm text-white placeholder:text-slate-500 outline-none transition focus:w-64 focus:border-neon/50 focus:bg-white/10"
      />
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </form>
  );
}
