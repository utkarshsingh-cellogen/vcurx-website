"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { createGlobeRenderer } from "./renderer";
import styles from "./Globe.module.css";

type GlobeProps = {
  className?: string;
};

/** Slowly turning, sunlit Earth rendered with WebGL from NASA Blue Marble imagery. */
export function Globe({ className }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const destroy = createGlobeRenderer(canvas, {
      still: reducedMotion,
      onReady: () => setReady(true),
    });
    return () => destroy?.();
  }, [reducedMotion]);

  return (
    <div className={`${styles.root} ${className ?? ""}`} aria-hidden="true">
      <canvas ref={canvasRef} className={`${styles.canvas} ${ready ? styles.ready : ""}`} />
    </div>
  );
}
