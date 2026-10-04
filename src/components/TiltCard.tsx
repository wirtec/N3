"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";

export function TiltCard({ children, className = "", max = 10 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (0.5 - py) * max;
    const ry = (px - 0.5) * max;
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0) scale(1.015)`;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  }
  function onLeave() {
    const el = ref.current;
    if (el) el.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
  }

  return (
    <div className="scene h-full">
      <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`card-3d relative h-full ${className}`}>
        <span className="shine" />
        {children}
      </div>
    </div>
  );
}
