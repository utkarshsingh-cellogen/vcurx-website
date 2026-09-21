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


All are public domain. Until textures load, each planet renders a simple fallback and crossfades
once they arrive.

## Fonts

The display font is Playfair Display (closest free match to "Cotta"). To use Cotta itself, add the
licensed font file under `src/fonts/` and swap `displayFont` in `src/lib/fonts.ts` to `next/font/local`.
