/** Shared by the pinned destination's CSS fade and its animation trigger. */
export const DESTINATION_VISIBLE_AT = 0.72;
export const DESTINATION_READY_AT = 0.84;
export type DestinationPhase = "hidden" | "arriving" | "ready";

export function destinationPhase(previous: DestinationPhase, progress: number): DestinationPhase {
  if (progress < DESTINATION_VISIBLE_AT) return "hidden";
  if (progress >= DESTINATION_READY_AT || previous === "ready") return "ready";
  return "arriving";
}

export const TEXT_LINE_STAGGER = 0.22;

/** Preserve the reference's order when the heading wraps onto more lines on mobile. */
export function revealTimings(headingLines: number, bodyLines: number) {
  const description = 0.55 + Math.max(0, headingLines - 2) * TEXT_LINE_STAGGER;
  const button = description + Math.max(1, bodyLines) * TEXT_LINE_STAGGER + 0.2;
  return { description, button, selector: button + 0.35 };
}
