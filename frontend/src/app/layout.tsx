import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { displayFont, inter, mono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  // Without this, relative asset URLs in the cards below stay relative, and a
  // shared link renders with no preview at all.
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
};

/**
 * The home page is one 420vh scroll journey, so a restored scroll position drops the
 * visitor mid-flight with nothing to orient them. Runs during parse, before the
 * browser gets to restore anything — an effect would restore first and then jump.
 *
 * It lives here rather than in the page because the root layout is only ever rendered
 * on the server. A page is re-rendered in the browser when it is reached by a client
 * navigation, and React refuses to create a <script> there: it would warn and never
 * run it. The path check keeps it to the home page, so every other page keeps its
 * normal back-button behaviour.
 */
const START_AT_TOP = `if(location.pathname==="/"){if("scrollRestoration" in history)history.scrollRestoration="manual";if(!location.hash)window.scrollTo(0,0);}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${displayFont.variable} ${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: START_AT_TOP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
