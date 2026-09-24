"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useScrollProgressRef } from "@/components/effects/ScrollStage";
import { createCosmosRenderer } from "./renderer";
import styles from "./CosmicBackground.module.css";

/**
 * Earth rises from the bottom of a starfield, then turns and zooms toward Delhi, India on scroll.
 * Falls back to a static CSS scene without WebGL.
 */
export function CosmicBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const progressRef = useScrollProgressRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const destroy = createCosmosRenderer(canvas, {
      still: reducedMotion,
      getScrollProgress: () => progressRef?.current ?? 0,
      onReady: () => setReady(true),
    });
    // Only reveal the static CSS planet when WebGL is unavailable; otherwise the page
    // opens on plain black space and the real planet rises into view.
    root.toggleAttribute("data-fallback", !destroy);
    return () => {
      destroy?.();
    };
  }, [reducedMotion, progressRef]);

  return (
    <div ref={rootRef} className={styles.root} aria-hidden="true">
      <div className={styles.fallback} />
      <canvas ref={canvasRef} className={`${styles.canvas} ${ready ? styles.ready : ""}`} />
    </div>
  );
}
