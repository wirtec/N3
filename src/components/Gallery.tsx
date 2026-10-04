"use client";

import { useState } from "react";
import type { ImageMeta } from "@/db/schema";

export function Gallery({ images, title }: { images: ImageMeta[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const visible = images.filter((_, i) => !broken[i]);

  if (!visible.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {images.map((img, i) =>
          broken[i] ? null : (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setActive(i)}
              className="neon-border scanline group relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt || title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setBroken((b) => ({ ...b, [i]: true }))}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-start text-[11px] text-cyan-100/90 opacity-0 transition group-hover:opacity-100">
                {img.type === "hero" ? "★ " : ""}
                {img.alt || img.url.split("/").pop()?.slice(0, 40)}
              </span>
            </button>
          ),
        )}
      </div>

      {active !== null && images[active] && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => setActive(null)}
          role="dialog"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active].url}
            alt={images[active].alt || title}
            referrerPolicy="no-referrer"
            className="max-h-[85vh] max-w-full rounded-2xl shadow-[0_0_80px_rgba(110,231,255,0.25)]"
          />
          <p className="mt-3 max-w-2xl text-center text-sm text-slate-200">{images[active].alt}</p>
        </div>
      )}
    </>
  );
}
