import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { displayFont, inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${displayFont.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
