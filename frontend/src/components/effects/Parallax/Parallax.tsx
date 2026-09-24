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

/**
 * Drifts its content gently against the mouse position. The loop runs only while the
 * content is still catching up with the pointer and on screen: it stops once settled
 * and waits for the next move, so a still pointer or a page scrolled past costs nothing.
 */
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
    let onScreen = true;

    const tick = () => {
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      // Within a hundredth of a pixel it has arrived: snap, draw once more, and rest.
      const settled = Math.abs(targetX - x) < 0.01 && Math.abs(targetY - y) < 0.01;
      if (settled) {
        x = targetX;
        y = targetY;
      }
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame && onScreen) frame = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * -strength.x;
      targetY = (e.clientY / window.innerHeight - 0.5) * -strength.y;
      wake();
    };
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) wake();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });

    window.addEventListener("mousemove", onMove, { passive: true });
    observer.observe(el);

    return () => {
      window.removeEventListener("mousemove", onMove);
      observer.disconnect();
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
