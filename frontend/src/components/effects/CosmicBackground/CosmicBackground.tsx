"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useScrollProgressRef } from "@/components/effects/ScrollStage";
import { createCosmosRenderer } from "./renderer";
import styles from "./CosmicBackground.module.css";

type CosmicBackgroundProps = {
  /**
   * `journey`: Earth rises, then turns and zooms toward Delhi on scroll.
   * `side`: the whole Earth sits right of centre, slowly turning, for a layout
   * with text on the left.
   */
  framing?: "journey" | "side";
  /** Side framing only: how large the Earth is drawn each frame, 1 for full size, 0 to hide it. */
  getEarthScale?: () => number;
};

/** A starfield with Earth in it. Falls back to a static CSS scene without WebGL. */
export function CosmicBackground({ framing = "journey", getEarthScale }: CosmicBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const progressRef = useScrollProgressRef();
  // Read through a ref, so a new function each render never tears down the WebGL context.
  const earthScaleRef = useRef(getEarthScale);
  useEffect(() => {
    earthScaleRef.current = getEarthScale;
  }, [getEarthScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const destroy = createCosmosRenderer(canvas, {
      still: reducedMotion,
      framing,
      getScrollProgress: () => progressRef?.current ?? 0,
      getEarthScale: () => earthScaleRef.current?.() ?? 1,
      onReady: () => setReady(true),
    });
    // Only reveal the static CSS planet when WebGL is unavailable; otherwise the page
    // opens on plain black space and the real planet fades into view.
    root.toggleAttribute("data-fallback", !destroy);
    return () => {
      destroy?.();
    };
  }, [reducedMotion, progressRef, framing]);

  return (
    <div ref={rootRef} className={styles.root} data-framing={framing} aria-hidden="true">
      <div className={styles.fallback} />
      <canvas ref={canvasRef} className={`${styles.canvas} ${ready ? styles.ready : ""}`} />
    </div>
  );
}
