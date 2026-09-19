import { Inter, Playfair_Display } from "next/font/google";

/**
 * Display face — closest free match to "Cotta" (high contrast, ball terminals).
 * To use Cotta itself, add its licensed file under src/fonts/ and swap this for next/font/local.
 */
export const displayFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
