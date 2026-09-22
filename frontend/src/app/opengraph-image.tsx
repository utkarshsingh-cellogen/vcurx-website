import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} — ${siteConfig.hero.tagline}`;

/**
 * The card every shared link renders. Generated at build time, so there is no
 * image file to keep in sync with the wordmark.
 *
 * Satori lays this out, not a browser: inline styles only, and any element with
 * more than one child needs an explicit display.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#f7f3ec",
        }}
      >
        <div style={{ display: "flex", fontSize: 168, letterSpacing: "-0.03em" }}>
          <span style={{ fontWeight: 700 }}>V</span>
          <span style={{ fontWeight: 400 }}>curX</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 28 }}>
          <div style={{ width: 96, height: 1, background: "rgba(247, 241, 232, 0.45)" }} />
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "rgba(247, 241, 232, 0.72)",
            }}
          >
            {siteConfig.hero.tagline}
          </div>
          <div style={{ width: 96, height: 1, background: "rgba(247, 241, 232, 0.45)" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
