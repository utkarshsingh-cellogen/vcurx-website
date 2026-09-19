"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type CountUpProps = {
  value: number;
  decimals?: number;
  suffix?: string;
  /** Animation length in ms. */
  duration?: number;
  className?: string;
};

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Number that counts up from zero the first time it scrolls into view. */
export function CountUp({ value, decimals = 0, suffix = "", duration = 2200, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const final = format(value, decimals) + suffix;

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    let frame = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          el.textContent = format(value * easeOutExpo(t), decimals) + suffix;
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        el.textContent = format(0, decimals) + suffix;
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, decimals, suffix, duration, reducedMotion]);

  // Server/initial render shows the final value, so the number is right without JS
  return (
    <span ref={ref} className={className}>
      {final}
    </span>
  );
}

function format(n: number, decimals: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
