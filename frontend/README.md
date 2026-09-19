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
│   ├── globals.css           # Design tokens + base styles
│   └── icon.svg              # Favicon
├── components/
│   ├── sections/             # Hero, PlanetSwitch, Home (Earth globe)
│   ├── effects/              # CosmicBackground + Globe (WebGL), Parallax, ScrollStage, Starfield
│   └── ui/                   # Primitives: AnimatedHeadline, GlassCard, WaveMarquee, PlanetSwitcher, …
├── config/
│   ├── site.ts               # Site name, metadata, hero headline copy
│   └── content.ts            # Copy and stats for every section below the hero
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

## Images and textures

`public/textures/` holds the planet surfaces rendered in WebGL:

- `mars-color.webp` — NASA/USGS Viking MDIM 2.1 colour mosaic, downscaled to 4096×2048
  ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mars_Viking_MDIM21_ClrMosaic_1km.jpg))
- `mars-height.png` — NASA MGS MOLA elevation model, 1024×512
  ([USGS Astrogeology](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m))
- `earth-color.webp`, `earth-clouds.webp` — NASA Visible Earth Blue Marble, 2048×1024
  ([NASA Visible Earth](https://visibleearth.nasa.gov/collection/1484/blue-marble))


All are public domain. Until textures load, each planet renders a simple fallback and crossfades
once they arrive.

## Fonts

The display font is Playfair Display (closest free match to "Cotta"). To use Cotta itself, add the
licensed font file under `src/fonts/` and swap `displayFont` in `src/lib/fonts.ts` to `next/font/local`.
