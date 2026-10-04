"use client";

import { useState } from "react";

/**
 * Plain <img> with graceful fallback (external publisher images may 403 /
 * hot-link block). Falls back to a generated gradient placeholder.
 */
export function SmartImage({
  src,
  alt,
  className,
  loading = "lazy",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`${className ?? ""} relative grid place-items-center overflow-hidden bg-gradient-to-br from-ink via-panel to-ink`}
        aria-label={alt}
      >
        <div className="grid-bg absolute inset-0 opacity-60" />
        <svg viewBox="0 0 24 24" className="relative h-10 w-10 text-neon/40" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m21 16-5-5-8 8" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
