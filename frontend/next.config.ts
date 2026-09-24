import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * `script-src` keeps 'unsafe-inline' deliberately. Next streams the RSC payload
 * through inline scripts, and the root layout parks the home page's scroll
 * restoration in one of its own, so a nonce-based policy would need middleware
 * running per request — which would turn all 27 statically generated pages
 * dynamic. The rest is locked down, so an injected script still cannot reach a
 * plugin, rewrite the document base, or frame the site.
 *
 * 'unsafe-eval' is added in development only: React's dev build uses eval() to
 * rebuild server call stacks for the error overlay. The production build never
 * calls it, so production keeps it out.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  // The dev server talks to the browser over a websocket for hot reload.
  isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Belt and braces with frame-ancestors, for anything that predates CSP.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // One year, no preload yet: preloading is a commitment that is hard to undo.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // 75 for photographs; 90 for product logos, whose fine type and hard edges show artefacts first.
    qualities: [75, 90],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // Virtual Cell was renamed CytoTwin, after its logo; links to the old page still land.
      { source: "/products/virtual-cell", destination: "/products/cytotwin", permanent: true },
    ];
  },
};

export default nextConfig;
