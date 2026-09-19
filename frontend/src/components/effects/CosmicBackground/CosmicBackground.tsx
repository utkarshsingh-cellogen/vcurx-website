"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useScrollProgressRef } from "@/components/effects/ScrollStage";
import { createCosmosRenderer } from "./renderer";
import styles from "./CosmicBackground.module.css";

/**
 * Full-bleed space scene drawn with WebGL: a real-data Mars rising from the bottom,
 * drifting and sparkling stars. Inside a ScrollStage, the planet approaches as you scroll.
 * Falls back to a static CSS scene without WebGL.
 */
export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const progressRef = useScrollProgressRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const destroy = createCosmosRenderer(canvas, {
      still: reducedMotion,
      getScrollProgress: () => progressRef?.current ?? 0,
      onReady: () => setReady(true),
    });
    return () => destroy?.();
  }, [reducedMotion, progressRef]);

  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.fallback} />
      <canvas ref={canvasRef} className={`${styles.canvas} ${ready ? styles.ready : ""}`} />
    </div>
  );
}
