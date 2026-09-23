"use client";

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { destinationPhase, DESTINATION_READY_AT, DESTINATION_VISIBLE_AT, type DestinationPhase } from "@/lib/revealSequence";

const ScrollProgressContext = createContext<RefObject<number> | null>(null);
const DestinationReadyContext = createContext(true);

/** Timed reveals must wait until the pinned destination has finished fading in. */
export function useDestinationReady() {
  return useContext(DestinationReadyContext);
}

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
  const [phase, setPhase] = useState<DestinationPhase>("hidden");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let frame = 0;

    /*
     * Screens of scroll at the tail of the track that buy no journey: progress
     * reaches 1 while this much of the pinned stage is still to be scrolled, so
     * whatever has arrived is held in place instead of being flicked past. Read
     * from the stylesheet, so the track's height and this stay one number.
     */
    const dwell = parseFloat(getComputedStyle(section).getPropertyValue("--dwell")) || 0;

    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const distance = rect.height - window.innerHeight * (1 + dwell);
      const progress = distance > 0 ? Math.min(Math.max(-rect.top / distance, 0), 1) : 0;
      progressRef.current = progress;
      section.style.setProperty("--progress", progress.toFixed(4));
      setPhase((previous) => destinationPhase(previous, progress));
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
      <section ref={sectionRef} className={className} style={{
        "--destination-start": DESTINATION_VISIBLE_AT,
        "--destination-ready": DESTINATION_READY_AT,
      } as CSSProperties}>
        <div className={stageClassName}>
          {children}
          {destination && (
            <div className={destinationClassName} hidden={phase === "hidden"} inert={phase !== "ready"}>
              <DestinationReadyContext.Provider value={phase === "ready"}>
                {destination}
              </DestinationReadyContext.Provider>
            </div>
          )}
        </div>
      </section>
    </ScrollProgressContext.Provider>
  );
}
