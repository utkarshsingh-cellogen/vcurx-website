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
 *
 * Two more variables drive scroll-linked motion outside the journey itself:
 * `--hold-progress` (0–1) runs while progress is paused at `--hold-at`, and `--exit`
 * (0–1) runs as the stage unpins and scrolls away.
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
    const css = getComputedStyle(section);
    const dwell = parseFloat(css.getPropertyValue("--dwell")) || 0;
    /*
     * A pause partway through: when progress reaches `--hold-at`, it stays there for
     * `--hold` screens of scroll before the journey carries on. Unlike the dwell it sits
     * mid-journey, so whatever is on screen at that point gets its own moment.
     */
    const hold = parseFloat(css.getPropertyValue("--hold")) || 0;
    const holdAt = parseFloat(css.getPropertyValue("--hold-at")) || 0;
    const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight;
      const holdPx = hold * viewport;
      // Scroll that actually moves the journey: the track, less the pinned screen, the dwell and the hold.
      const distance = rect.height - viewport * (1 + dwell) - holdPx;
      const scrolled = Math.max(-rect.top, 0);
      const holdStart = holdAt * distance;
      const journey = scrolled < holdStart ? scrolled : Math.max(holdStart, scrolled - holdPx);
      const progress = distance > 0 ? clamp01(journey / distance) : 0;
      const held = holdPx > 0 ? clamp01((scrolled - holdStart) / holdPx) : 0;
      // Zero while pinned, one once the stage has scrolled a full screen out of view.
      const exit = clamp01(1 - rect.bottom / viewport);

      progressRef.current = progress;
      section.style.setProperty("--progress", progress.toFixed(4));
      section.style.setProperty("--hold-progress", held.toFixed(4));
      section.style.setProperty("--exit", exit.toFixed(4));
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
