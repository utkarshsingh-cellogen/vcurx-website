"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type ParallaxProps = {
  children: ReactNode;
  className?: string;
  /** Max horizontal / vertical drift in px. */
  strength?: { x: number; y: number };
  /** Easing factor per frame, 0–1. Lower = floatier. */
  ease?: number;
};

/** Drifts its content gently against the mouse position. */
export function Parallax({
  children,
  className,
  strength = { x: 14, y: 10 },
  ease = 0.05,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * -strength.x;
      targetY = (e.clientY / window.innerHeight - 0.5) * -strength.y;
    };

    const tick = () => {
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
      el.style.transform = "";
    };
  }, [reducedMotion, strength.x, strength.y, ease]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
