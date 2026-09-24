"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { CosmicBackground } from "@/components/effects/CosmicBackground";
import { sideFrame } from "@/components/effects/CosmicBackground/camera";
import { createGalaxyRenderer, type GalaxyRenderer, type GalaxySpec } from "@/components/ui/GalaxyRow/renderer";
import {
  EARTH,
  EARTH_RADIUS,
  GALAXY_RADIUS,
  MOON_ORBIT,
  MOON_RADIUS,
  ORBIT_TILT,
  PLANETS,
  SUN_IN_GALAXY,
  SUN_RADIUS,
  orbitAngle,
  smoothstep,
  zoomAt,
} from "./timeline";
import styles from "./CosmicZoom.module.css";

/**
 * The Milky Way as the familiar portraits draw it: a barred spiral seen from above at a
 * slight slant, a warm bar through the middle, two major arms and two fainter ones
 * broken into star clusters and pink nebulae, fine dust along their inner edges, and
 * the Magellanic Clouds off to one side.
 */
const MILKY_WAY: GalaxySpec = {
  seed: 11,
  positionAngle: -22,
  inclination: 28,
  wind: 4.4,
  mirror: 1,
  companion: { x: 0.9, y: -0.66, size: 0.06 },
  accent: "#86a4ff",
  shape: { arms: 4, minorArms: 0.5, bar: 0.2, armWidth: 1.7, density: 3.2, dust: 0.85, dustGrain: 0.5, clumps: 1 },
};

/** Below this the shader's globe is under a few pixels, and a plain dot takes over from it. */
const HANDOFF_PX = 3;
const MAX_PIXEL_RATIO = 2;

type Vec = { x: number; y: number };

/** The Sun's place in the galaxy, as seen on screen, in galaxy radii with y up. */
function sunOffsetInGalaxy(): Vec {
  const rad = Math.PI / 180;
  const { radius, angle } = SUN_IN_GALAXY;
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle) * MILKY_WAY.mirror * Math.cos(MILKY_WAY.inclination * rad);
  const pa = MILKY_WAY.positionAngle * rad;
  return { x: x * Math.cos(pa) - y * Math.sin(pa), y: x * Math.sin(pa) + y * Math.cos(pa) };
}

/**
 * Earth, then a camera pulling back through the Moon's orbit and the planets to the
 * whole Milky Way, played once on load and left on the galaxy.
 *
 * Three layers share one camera. The shader keeps drawing the stars and, while it is
 * big enough to matter, the Earth. A 2D canvas draws the solar system: orbits,
 * planets, the Moon, the Sun and the labels. The galaxy engine from the domains row
 * draws the Milky Way. The camera is a centre and a scale in real units, so each layer
 * only has to turn its own positions into pixels.
 */
export function CosmicZoom() {
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const galaxyRef = useRef<HTMLCanvasElement>(null);
  const earthScaleRef = useRef(1);
  const reducedMotion = usePrefersReducedMotion();
  const getEarthScale = useCallback(() => earthScaleRef.current, []);

  useEffect(() => {
    const root = rootRef.current;
    const overlay = overlayRef.current;
    const galaxyCanvas = galaxyRef.current;
    const ctx = overlay?.getContext("2d");
    if (!root || !overlay || !galaxyCanvas || !ctx) return;
    // Reduced motion keeps the still, whole Earth: the journey is all movement.
    if (reducedMotion) {
      earthScaleRef.current = 1;
      return;
    }

    const galaxy: GalaxyRenderer | null = createGalaxyRenderer(galaxyCanvas, [MILKY_WAY], { still: false });
    const sunOffset = sunOffsetInGalaxy();
    const galaxyCenter = { x: -sunOffset.x * GALAXY_RADIUS, y: -sunOffset.y * GALAXY_RADIUS };

    let width = 0;
    let height = 0;
    let ratio = 1;
    let narrow = false;
    const resize = () => {
      width = root.clientWidth;
      height = root.clientHeight;
      ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      narrow = window.matchMedia("(max-width: 767px)").matches;
      overlay.width = Math.round(width * ratio);
      overlay.height = Math.round(height * ratio);
      galaxy?.layout(width, height, []);
      draw();
    };

    let seconds = 0;
    let orbitClock = 0;
    let last = 0;
    let frame = 0;
    let visible = true;
    let done = false;

    function draw() {
      if (!width || !height || !ctx) return;

      // Where the shader draws the Earth: centred in its canvas, which is 150% wide on wide screens.
      const canvasWidth = narrow ? width : width * 1.5;
      const frameAt = sideFrame(canvasWidth / height);
      const focal = { x: canvasWidth / 2, y: height / 2 - frameAt.centerY * height };
      const earthStartPx = frameAt.radius * height;

      // The three stops, as log10 of the AU spanned by half the screen's height.
      const levelFor = (size: number, px: number) => Math.log10((size * height) / (2 * px));
      const planetsPx = narrow ? 0.42 * width : Math.min(0.36 * height, 0.22 * width);
      const galaxyPx = narrow ? 0.46 * width : Math.min(0.46 * height, 0.235 * width);
      const { level, done: finished } = zoomAt(
        seconds,
        levelFor(EARTH_RADIUS, earthStartPx),
        levelFor(EARTH.orbit, planetsPx),
        levelFor(GALAXY_RADIUS, galaxyPx),
      );
      done = finished;
      const k = height / (2 * Math.pow(10, level)); // pixels per AU

      // The world, in AU with the Sun at the origin and y up.
      const at = (orbit: number, angle: number): Vec => ({
        x: orbit * Math.cos(angle),
        y: orbit * Math.sin(angle) * ORBIT_TILT,
      });
      const earth = at(EARTH.orbit, orbitAngle(EARTH, orbitClock));
      const moonAngle = orbitClock * 1.4;
      const moon = { x: earth.x + MOON_ORBIT * Math.cos(moonAngle), y: earth.y + MOON_ORBIT * Math.sin(moonAngle) * ORBIT_TILT };

      // The camera rides with the Earth, drifts to the Sun as the planets come in, then to the galaxy's heart.
      const toSun = smoothstep(-1.4, 0.4, level);
      const toGalaxy = smoothstep(6.6, 9.3, level);
      const onEarth = (1 - toSun) * (1 - toGalaxy);
      const cam = {
        x: earth.x * onEarth + galaxyCenter.x * toGalaxy,
        y: earth.y * onEarth + galaxyCenter.y * toGalaxy,
      };
      const screen = (p: Vec): Vec => ({ x: focal.x + (p.x - cam.x) * k, y: focal.y - (p.y - cam.y) * k });

      // Earth: the shader's globe while it is big, then a dot from here on.
      const earthPx = EARTH_RADIUS * k;
      earthScaleRef.current = earthPx > HANDOFF_PX ? earthPx / earthStartPx : 0;

      // The galaxy fades in once the camera has left the neighbourhood of the Sun.
      const galaxyIn = smoothstep(6.2, 8.4, level);
      const g = screen(galaxyCenter);
      galaxy?.place([galaxyIn > 0 ? { x: g.x, y: g.y, radius: GALAXY_RADIUS * k, gain: galaxyIn } : null]);

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const sun = screen({ x: 0, y: 0 });
      const system = smoothstep(-2.6, -1.4, level) * (1 - smoothstep(5.2, 7.0, level));

      // Orbits, faint, each appearing as it grows large enough to read and gone once it is huge.
      ctx.lineWidth = 1;
      for (const planet of PLANETS) {
        const r = planet.orbit * k;
        if (r < 5 || r > 6 * Math.max(width, height)) continue;
        const alpha = system * 0.3 * smoothstep(5, 30, r);
        if (alpha < 0.005) continue;
        ctx.strokeStyle = `rgba(170, 195, 255, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(sun.x, sun.y, r, r * ORBIT_TILT, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // The Moon and its orbit, while there is room between it and the Earth to see them apart.
      const moonGap = MOON_ORBIT * k;
      const moonIn = smoothstep(8, 26, moonGap) * (moonGap < 2 * Math.max(width, height) ? 1 : 0);
      if (moonIn > 0.01) {
        const e = screen(earth);
        ctx.strokeStyle = `rgba(200, 210, 230, ${0.18 * moonIn})`;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, moonGap, moonGap * ORBIT_TILT, 0, 0, Math.PI * 2);
        ctx.stroke();
        dot(screen(moon), Math.max(1.3, MOON_RADIUS * k), `rgba(214, 214, 210, ${moonIn})`, 0);
      }

      // Planets. Earth only once the shader has handed it over.
      for (const planet of PLANETS) {
        const r = planet.orbit * k;
        const isEarth = planet === EARTH;
        const alpha = isEarth
          ? (earthPx <= HANDOFF_PX ? 1 : 0) * (1 - smoothstep(4.5, 6.5, level))
          : system * smoothstep(8, 40, r);
        if (alpha < 0.01) continue;
        const p = screen(isEarth ? earth : at(planet.orbit, orbitAngle(planet, orbitClock)));
        dot(p, isEarth ? Math.max(1.8, earthPx) : planet.size, withAlpha(planet.color, alpha), isEarth ? 6 : 0);
      }

      // The Sun: a disc with a glow while close, a star once far, gone into the galaxy at the end.
      const sunIn = smoothstep(-1.8, -0.8, level) * (1 - smoothstep(6.5, 8.0, level));
      if (sunIn > 0.01) {
        const sunPx = SUN_RADIUS * k;
        const glow = Math.min(Math.max(sunPx * 3.5, 9), 160);
        const halo = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, glow);
        halo.addColorStop(0, `rgba(255, 244, 214, ${0.95 * sunIn})`);
        halo.addColorStop(0.25, `rgba(255, 196, 110, ${0.45 * sunIn})`);
        halo.addColorStop(1, "rgba(255, 170, 80, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, glow, 0, Math.PI * 2);
        ctx.fill();
        dot(sun, Math.max(sunPx, 1.8), `rgba(255, 250, 235, ${sunIn})`, 0);
      }

      // Labels, while the planets are the subject.
      const labels = smoothstep(-0.2, 0.6, level) * (1 - smoothstep(2.4, 3.4, level));
      if (labels > 0.01) {
        label("Sun", sun, labels);
        label("Earth", screen(earth), labels);
      }


    }

    function dot(p: Vec, r: number, color: string, glow: number) {
      if (!ctx) return;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function label(text: string, p: Vec, alpha: number) {
      if (!ctx) return;
      ctx.font = "500 10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.letterSpacing = "2px";
      ctx.fillStyle = `rgba(236, 232, 226, ${0.75 * alpha})`;
      ctx.fillText(text.toUpperCase(), p.x + 10, p.y - 10);
    }

    const step = (now: number) => {
      frame = 0;
      // Capped, so a hidden tab resumes where it paused; loose enough that a slow machine keeps pace.
      const dt = last ? Math.min((now - last) / 1000, 0.25) : 0;
      last = now;
      seconds += dt;
      orbitClock += dt;
      draw();
      // Once on the galaxy, the overlay holds still; the galaxy keeps turning on its own loop.
      if (!done && visible) frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (frame || done || !visible) return;
      last = 0;
      frame = requestAnimationFrame(step);
    };

    const view = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      galaxy?.setVisible(visible);
      if (visible) start();
    });
    const sizes = new ResizeObserver(resize);
    sizes.observe(root);
    view.observe(root);
    resize();
    start();

    return () => {
      cancelAnimationFrame(frame);
      view.disconnect();
      sizes.disconnect();
      galaxy?.destroy();
      earthScaleRef.current = 1;
    };
  }, [reducedMotion]);

  return (
    <div ref={rootRef} className={styles.root} aria-hidden="true">
      <CosmicBackground framing="side" getEarthScale={getEarthScale} />
      <canvas ref={galaxyRef} className={styles.layer} />
      <canvas ref={overlayRef} className={styles.layer} />
    </div>
  );
}

/** A `#rrggbb` colour at the given opacity. */
function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
