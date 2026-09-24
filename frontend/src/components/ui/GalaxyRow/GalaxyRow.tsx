"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { Icon } from "@/components/ui/Icon";
import { createGalaxyRenderer, type GalaxyRenderer, type GalaxySpec } from "./renderer";
import styles from "./GalaxyRow.module.css";

export type GalaxyItem = {
  key: string;
  name: string;
  href: string;
  /** A `--domain-*` custom property name, without `var()`. */
  accent: string;
};

/** Every galaxy lies the same way, rising to the right like Andromeda in the photographs. */
const POSITION_ANGLE = 30;
const INCLINATION = 70;

/**
 * How each galaxy lies on the sky, repeated down the row. They share one tilt and one
 * sense of turn so the row reads as aligned; the seed, winding and companion are what
 * tell them apart.
 */
const SKIES: readonly Omit<GalaxySpec, "accent">[] = [
  { seed: 31, wind: 4.6, companion: { x: 0.36, y: -0.4, size: 0.075 } },
  { seed: 58, wind: 5.2 },
  { seed: 77, wind: 4.2, companion: { x: -0.3, y: 0.34, size: 0.05 } },
  { seed: 90, wind: 4.9 },
].map((sky) => ({ ...sky, positionAngle: POSITION_ANGLE, inclination: INCLINATION, mirror: 1 as const }));

const skyFor = (i: number) => SKIES[i % SKIES.length];

type GalaxyRowProps = {
  items: readonly GalaxyItem[];
  /** What happens below 1024px: `hide` steps aside for a caller with its own small-screen layout. */
  narrow?: "grid" | "hide";
  className?: string;
};

/**
 * A row of spiral galaxies, one per link. Pointing at or tabbing to one brightens it,
 * grows it and speeds its turn while the others dim — one live galaxy at a time, the
 * way the card deck it replaces behaved.
 *
 * All four are drawn on one WebGL canvas behind the links; the links themselves are
 * ordinary DOM, so they keep their focus, hit area and accessible names.
 */
export function GalaxyRow({ items, narrow = "grid", className }: GalaxyRowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skyRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const rendererRef = useRef<GalaxyRenderer | null>(null);
  const activeRef = useRef<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    activeRef.current = active;
    rendererRef.current?.setActive(active);
  }, [active]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    let renderer: GalaxyRenderer | null = null;
    let resize: ResizeObserver | null = null;

    const measure = () => {
      if (!renderer) return;
      const box = canvas.getBoundingClientRect();
      const slots = skyRefs.current.map((el) => {
        const r = el?.getBoundingClientRect();
        return r
          ? { x: r.left - box.left, y: r.top - box.top, width: r.width, height: r.height }
          : { x: 0, y: 0, width: 0, height: 0 };
      });
      renderer.layout(box.width, box.height, slots);
    };

    // Built on first approach, not on mount: the stars cost a few milliseconds to lay out,
    // and a row hidden on small screens never approaches, so it never pays for a context.
    const build = () => {
      const css = getComputedStyle(root);
      const specs = items.map((item, i) => ({ ...skyFor(i), accent: css.getPropertyValue(item.accent) }));
      renderer = createGalaxyRenderer(canvas, specs, { still: reducedMotion });
      root.dataset.gl = renderer ? "on" : "off";
      if (!renderer) return;
      rendererRef.current = renderer;
      renderer.setActive(activeRef.current);
      measure();
      resize = new ResizeObserver(measure);
      resize.observe(canvas);
      skyRefs.current.forEach((el) => el && resize?.observe(el));
    };

    const view = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !renderer && root.dataset.gl !== "off") build();
        renderer?.setVisible(entry.isIntersecting);
      },
      { rootMargin: "240px 0px" },
    );
    view.observe(root);

    return () => {
      view.disconnect();
      resize?.disconnect();
      renderer?.destroy();
      rendererRef.current = null;
      delete root.dataset.gl;
    };
  }, [items, reducedMotion]);

  return (
    <div
      ref={rootRef}
      className={`${styles.row} ${className ?? ""}`}
      data-narrow={narrow}
      onPointerLeave={() => setActive(null)}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      <ul className={styles.list}>
        {items.map((item, i) => (
          <li
            key={item.key}
            className={styles.item}
            data-state={active === null ? "idle" : i === active ? "active" : "recede"}
            style={
              {
                "--domain": `var(${item.accent})`,
                "--pa": `${-skyFor(i).positionAngle}deg`,
              } as CSSProperties
            }
          >
            <Link
              href={item.href}
              className={styles.link}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <span
                ref={(el) => {
                  skyRefs.current[i] = el;
                }}
                className={styles.sky}
                aria-hidden="true"
              />
              <span className={styles.label}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.cta} aria-hidden="true">
                  Explore
                  <Icon name="arrowUpRight" size={12} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
