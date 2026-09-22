export type HeadlineSegment = {
  text: string;
  /** Renders in the accent italic with the moving light shimmer. */
  accent?: boolean;
  /** Renders in a heavy weight. */
  bold?: boolean;
};

/**
 * Absolute origin. Shared links need it: without a base, Next cannot resolve
 * the preview image to an absolute URL and the card renders blank.
 * Vercel exposes the production domain at build time.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://vcurx-ai.vercel.app");

export const siteConfig = {
  name: "VcurX",
  url: siteUrl,
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
