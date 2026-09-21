"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

const ScrollProgressContext = createContext<RefObject<number> | null>(null);

/** Live 0–1 scroll progress through the nearest ScrollStage (a ref, so reading it never re-renders). */
export function useScrollProgressRef() {
  return useContext(ScrollProgressContext);
}

type ScrollStageProps = {
  children: ReactNode;
  className?: string;
  stageClassName?: string;
  destination?: ReactNode;
  destinationClassName?: string;
};

/**
 * A tall section whose child "stage" stays pinned to the viewport while the user scrolls through it.
 * Progress is exposed as the CSS variable `--progress` (0–1) and via `useScrollProgressRef()`.
 */
export function ScrollStage({ children, className, stageClassName, destination, destinationClassName }: ScrollStageProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const [destinationVisible, setDestinationVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      const progress = distance > 0 ? Math.min(Math.max(-rect.top / distance, 0), 1) : 0;
      progressRef.current = progress;
      section.style.setProperty("--progress", progress.toFixed(4));
      setDestinationVisible(progress >= 0.72);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <ScrollProgressContext.Provider value={progressRef}>
      <section ref={sectionRef} className={className}>
        <div className={stageClassName}>
          {children}
          {destination && (
            <div className={destinationClassName} hidden={!destinationVisible} inert={!destinationVisible}>
              {destination}
            </div>
          )}
        </div>
      </section>
    </ScrollProgressContext.Provider>
  );
}
