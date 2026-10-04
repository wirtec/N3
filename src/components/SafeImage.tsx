"use client";

import { useState } from "react";

/** <img> with a generated space-y placeholder when the src is missing or fails. */
export function SafeImage({ src, alt, className = "" }: { src: string | null | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} grid place-items-center bg-[radial-gradient(circle_at_30%_30%,rgba(110,231,255,0.25),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(244,114,182,0.25),transparent_50%),#0b0f2a]`}>
        <span className="font-display text-4xl font-black text-white/20">NOVA</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className} />;
}
