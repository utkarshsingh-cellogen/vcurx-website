# Curax AI — Frontend

Next.js 16 (App Router) + TypeScript + CSS Modules.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint
```

## Project structure

```
src/
├── app/                      # Routes (App Router)
│   ├── layout.tsx            # Root layout: fonts, metadata, viewport
│   ├── page.tsx              # Home page
│   ├── domains/[slug]/       # One page per domain (static)
│   ├── products/[slug]/      # One page per product (static)
│   ├── robots.ts             # robots.txt
│   ├── sitemap.ts            # sitemap.xml, generated from products.ts
│   ├── opengraph-image.tsx   # Share card, rendered at build time
│   ├── globals.css           # Design tokens + base styles
│   └── icon.svg              # Favicon
├── components/
│   ├── sections/             # Hero, Domains (orbit map), PlanetSwitch
│   ├── effects/              # CosmicBackground (WebGL), DeepSpace, Parallax, ScrollStage, Starfield
│   └── ui/                   # Primitives: AnimatedHeadline, GlassCard, WaveMarquee, PlanetSwitcher, …
├── data/
│   └── products.ts           # Domains + products — the single source of truth
├── config/
│   ├── site.ts               # Site name, metadata, hero headline copy
│   └── content.ts            # Copy for every section below the hero, and the journey stops
├── hooks/                    # Shared React hooks
└── lib/
    ├── fonts.ts              # next/font definitions
    └── webgl.ts              # Shared WebGL helpers (program, fullscreen triangle, textures)
```

Each component lives in its own folder with its `.tsx`, `.module.css` and an `index.ts` barrel.

## Editing the hero

Change the headline in `src/config/site.ts`. Each inner array is one line; mark a segment with
`accent: true` to render it in the italic starlight shimmer. `sparkleIndex` picks the letter whose
counter holds the twinkling ✦.

## Editing the sections

All copy below the hero lives in `src/config/content.ts`.


## Domain Intelligence

`src/data/products.ts` is the single source of truth for the orbit on the home page
(`#domains`), the mobile list, `/domains/[slug]` and `/products/[slug]`. All of those routes
are statically generated from it via `generateStaticParams`.

### Adding a product

Append one object to the `products` array — nothing else needs to change:

```ts
{
  name: "New Product",
  slug: "new-product",        // becomes /products/new-product
  domain: "research",         // therapeutics | research | clinical | diagnostic
  group: "Design",            // must match one of that domain's `groups`
  oneLiner: "What it does, in one line.",
  status: "in-lab",           // live | beta | in-lab
  problem: "...",             // optional — falls back to a TODO placeholder
  steps: ["...", "...", "..."], // optional — exactly three
}
```

A new domain means one entry in `domains` (with a `--domain-*` colour token in
`globals.css`) plus a fifth angle in `BASE_ANGLES` in `OrbitMap.tsx`.

Each domain's accent is a token in `src/app/globals.css`: `--domain-therapeutics`,
`--domain-research`, `--domain-clinical`, `--domain-diagnostic`.

## Headers and metadata

`next.config.ts` sets the security headers on every route: a Content Security Policy,
`Cross-Origin-Opener-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`,
`Permissions-Policy` and HSTS. The policy keeps `'unsafe-inline'` on `script-src` on purpose —
Next streams the RSC payload through inline scripts, so a nonce would need per-request
middleware and every statically generated page would turn dynamic.

Shared links need an absolute origin. `siteConfig.url` reads `NEXT_PUBLIC_SITE_URL`, falls back
to Vercel's production domain at build time, and finally to the deployed URL. It feeds
`metadataBase`, the sitemap and `robots.txt`. `src/app/opengraph-image.tsx` renders the card
itself, so there is no image file to keep in step with the wordmark.

## Images and textures

`public/textures/` holds the planet surfaces rendered in WebGL:

- `earth-clouds.webp` — NASA Visible Earth Blue Marble, 2048×1024
  ([NASA Visible Earth](https://visibleearth.nasa.gov/collection/1484/blue-marble))
- `earth-color.webp` — NASA Blue Marble Next Generation, December 2004, with topography
  and bathymetry, resized from 21600×10800 to 2048×1024.
- `earth-india-4096.webp`, `earth-india-2048.webp` — regional detail from the same
  [NASA source](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/december/world.topo.bathy.200412.3x21600x10800.jpg).
  Bounds: 35°E–120°E, 10°S–75°N. Crop the source at x=12900, y=900, width=5100,
  height=5100, then resize to 4096² / 2048² and encode WebP at quality 92.
  The base globe uses WebP quality 90. Matching imagery avoids seams when blending.

The hero first centres India, then dives into Delhi (28.6139°N, 77.2090°E) and reveals
the first interlude inside the same pinned viewport. The camera is configured in
`src/components/effects/CosmicBackground/camera.ts`. Regional detail loads after the base
textures, fades in on approach, and uses the 2048 version on GPUs limited to smaller
textures. The small base texture remains available if the detail request fails.


`milkyway.webp` / `milkyway-1100.webp` back the Domain Intelligence section: the ESO/S. Brunier
all-sky panorama ([eso0932a](https://www.eso.org/public/images/eso0932a/)), licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Cropped from the 6000×3000 original at
x=2600, y=700, 3000×1800, then resized to 2000×1200 and 1100×660 and encoded as WebP.

The planet textures are public domain. Until textures load, each planet renders a simple fallback and crossfades
once they arrive.

## Fonts

The display font is Playfair Display (closest free match to "Cotta"). To use Cotta itself, add the
licensed font file under `src/fonts/` and swap `displayFont` in `src/lib/fonts.ts` to `next/font/local`.
