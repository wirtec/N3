"use client";

import { useEffect, useState } from "react";
import { SmartImage } from "./SmartImage";

export function Gallery({ images, title, label }: { images: string[]; title: string; label: string }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? null : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  if (!images.length) return null;

  return (
    <section className="mt-12">
      <h2 className="font-display mb-4 flex items-center gap-3 text-xl font-bold text-white">
        <span className="h-6 w-1 rounded-full bg-gradient-to-b from-neon to-violet" />
        {label}
        <span className="font-mono text-xs font-normal text-slate-500">({images.length})</span>
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setOpen(i)}
            className={`card group relative overflow-hidden rounded-xl border border-white/8 bg-ink ${
              i === 0 ? "col-span-2 row-span-2 aspect-[4/3]" : "aspect-[4/3]"
            }`}
          >
            <SmartImage src={src} alt={`${title} – ${i + 1}`} className="h-full w-full object-cover" />
            <span className="absolute bottom-2 end-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-neon opacity-0 transition group-hover:opacity-100">
              {i + 1}/{images.length}
            </span>
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur"
          onClick={() => setOpen(null)}
          role="dialog"
        >
          <img
            src={images[open]}
            alt={`${title} – ${open + 1}`}
            referrerPolicy="no-referrer"
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-4 flex items-center gap-4 font-mono text-sm text-slate-300" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-1 hover:border-neon hover:text-neon"
              onClick={() => setOpen((open - 1 + images.length) % images.length)}
            >
              ‹
            </button>
            <span>
              {open + 1} / {images.length}
            </span>
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-1 hover:border-neon hover:text-neon"
              onClick={() => setOpen((open + 1) % images.length)}
            >
              ›
            </button>
            <a
              href={images[open]}
              target="_blank"
              rel="noreferrer"
              className="ms-4 text-xs text-slate-500 underline hover:text-neon"
            >
              ↗
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
