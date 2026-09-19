"use client";

import { useEffect, useId, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import styles from "./WaveMarquee.module.css";

type WaveMarqueeProps = {
  text: string;
  /** Scroll speed in SVG units per second. */
  speed?: number;
  className?: string;
};

const REPEATS = 26;
const WAVE =
  "M -40 70 C 140 20, 300 120, 480 70 S 820 20, 1000 70 S 1340 120, 1520 70";

/** A cream ribbon that waves across the section with text endlessly sliding along it. */
export function WaveMarquee({ text, speed = 40, className }: WaveMarqueeProps) {
  const id = useId().replace(/:/g, "");
  const pathId = `wave-${id}`;
  const textPathRef = useRef<SVGTextPathElement>(null);
  const unitRef = useRef<SVGTextElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const unit = `${text}  ✦  `;

  useEffect(() => {
    const textPath = textPathRef.current;
    const unitEl = unitRef.current;
    if (!textPath || !unitEl || reducedMotion) return;

    // Loop seamlessly by wrapping the offset every one repeat-unit
    const unitLength = unitEl.getComputedTextLength();
    if (!unitLength) return;
    let offset = 0;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      offset -= (speed * (now - last)) / 1000;
      last = now;
      if (offset <= -unitLength) offset += unitLength;
      textPath.setAttribute("startOffset", offset.toFixed(2));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [speed, reducedMotion]);

  return (
    <div className={`${styles.wrap} ${className ?? ""}`} aria-hidden="true">
      <svg className={styles.svg} viewBox="0 0 1440 140" preserveAspectRatio="xMidYMid slice">
        <defs>
          <path id={pathId} d={WAVE} />
        </defs>
        <use href={`#${pathId}`} className={styles.ribbon} />
        <text className={styles.text} dominantBaseline="central">
          <textPath ref={textPathRef} href={`#${pathId}`}>
            {unit.repeat(REPEATS)}
          </textPath>
        </text>
        {/* Off-screen copy of one unit, used only to measure its length */}
        <text ref={unitRef} className={styles.text} x="-9999" y="-9999">
          {unit}
        </text>
      </svg>
    </div>
  );
}
