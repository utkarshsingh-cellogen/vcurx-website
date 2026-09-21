export type HeadlineSegment = {
  text: string;
  /** Renders in the accent italic with the moving light shimmer. */
  accent?: boolean;
  /** Renders in a heavy weight. */
  bold?: boolean;
};

export const siteConfig = {
  name: "VcurX",
  description: "VcurX — we cure us.",
  themeColor: "#000000",
  hero: {
    /** Each inner array is one line of the headline. */
    headline: [[{ text: "V", bold: true }, { text: "curX" }]] satisfies HeadlineSegment[][],
    /** Index of the headline letter that holds the ✦ sparkle (1 = the "c"). */
    sparkleIndex: 1,
    tagline: "Healing Beyond",
  },
} as const;
