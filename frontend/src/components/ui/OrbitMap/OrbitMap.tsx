"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { domains, getDomain, productsIn, type DomainSlug } from "@/data/products";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { DomainNode } from "@/components/ui/DomainNode";
import { DomainFocus } from "./DomainFocus";
import styles from "./OrbitMap.module.css";

/** Orbit radii as a fraction of the stage box. */
const RX = 0.34;
const RY = 0.3;
const PERIOD_SECONDS = 110;
/** Where each domain starts out: upper-left, lower-left, lower-right, upper-right. */
const BASE_ANGLES = [225, 135, 45, 315].map((degrees) => (degrees * Math.PI) / 180);

type OrbitMapProps = {
  className?: string;
};

/**
 * VcurX AI at the centre, the four domains turning slowly around it, their products
 * one layer further out. Clicking a domain zooms into it; Escape or Back returns.
 */
export function OrbitMap({ className }: OrbitMapProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const backRef = useRef<HTMLButtonElement>(null);
  const openedIndexRef = useRef(0);
  const offsetRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);

  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState<DomainSlug | null>(null);
  const [focused, setFocused] = useState<DomainSlug | null>(null);
  const [settled, setSettled] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  /** Writes every node and connector position for the current rotation offset. */
  const layout = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const cx = width / 2;
    const cy = height / 2;

    BASE_ANGLES.forEach((base, i) => {
      const angle = base + offsetRef.current;
      const x = cx + width * RX * Math.cos(angle);
      const y = cy + height * RY * Math.sin(angle);

      const node = nodeRefs.current[i];
      if (node) {
        node.style.setProperty("--x", `${x}px`);
        node.style.setProperty("--y", `${y}px`);
      }
      const line = lineRefs.current[i];
      if (line) {
        line.style.setProperty("--length", `${Math.hypot(x - cx, y - cy)}px`);
        line.style.setProperty("--angle", `${Math.atan2(y - cy, x - cx)}rad`);
      }
    });
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [layout]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // The orbit only turns while it is on screen, motion is welcome and nothing is focused.
  useEffect(() => {
    if (!inView || reducedMotion || focused) {
      lastFrameRef.current = null;
      return;
    }
    let frame = 0;
    const step = (Math.PI * 2) / PERIOD_SECONDS;
    const tick = (now: number) => {
      if (lastFrameRef.current !== null) {
        offsetRef.current += ((now - lastFrameRef.current) / 1000) * step;
        layout();
      }
      lastFrameRef.current = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reducedMotion, focused, layout]);

  // Let the focus view paint in its closed state before marking it open, so it transitions in.
  useEffect(() => {
    if (!focused) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setSettled(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [focused]);

  useEffect(() => {
    if (settled) backRef.current?.focus();
  }, [settled]);

  const open = useCallback((slug: DomainSlug) => {
    openedIndexRef.current = domains.findIndex((domain) => domain.slug === slug);
    setHovered(null);
    setFocused(slug);
  }, []);

  const close = useCallback(() => {
    setFocused(null);
    setSettled(false);
    requestAnimationFrame(() => nodeRefs.current[openedIndexRef.current]?.focus());
  }, []);

  const focusedDomain = focused ? getDomain(focused) : undefined;
  const phase = focused ? (settled ? "open" : "opening") : "closed";

  return (
    <div
      className={`${styles.root} ${className ?? ""}`}
      data-focus={phase}
      onKeyDown={(event) => {
        if (event.key === "Escape" && focused) {
          event.stopPropagation();
          close();
        }
      }}
    >
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.orbit} inert={focused !== null}>
          <span className={styles.ring} aria-hidden="true" />
          <span className={styles.innerRing} aria-hidden="true" />

          {domains.map((domain, i) => (
            <span
              key={`line-${domain.slug}`}
              ref={(element) => {
                lineRefs.current[i] = element;
              }}
              className={styles.line}
              data-state={hovered === null ? "idle" : hovered === domain.slug ? "active" : "dimmed"}
              style={{ "--domain": `var(${domain.accent})` } as CSSProperties}
              aria-hidden="true"
            />
          ))}

          <span className={styles.core} aria-hidden="true">
            <span className={styles.coreName}>VcurX AI</span>
            <span className={styles.coreRole}>core</span>
          </span>

          {domains.map((domain, i) => (
            <DomainNode
              key={domain.slug}
              ref={(element) => {
                nodeRefs.current[i] = element;
              }}
              domain={domain}
              count={productsIn(domain.slug).length}
              state={hovered === null ? "idle" : hovered === domain.slug ? "active" : "dimmed"}
              onSelect={open}
              onHover={setHovered}
            />
          ))}
        </div>

        {focusedDomain && <DomainFocus domain={focusedDomain} backRef={backRef} onBack={close} />}
      </div>
    </div>
  );
}
