"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { DOMAINS, type SolarDomain } from "./domains.data";
import {
  GEN,
  RIN,
  RN,
  ROUT,
  TH,
  TW,
  clamp,
  hexRgb,
  renderSun,
  smooth,
  type PlanetKind,
  type PlanetTexture,
} from "./planetTextures";
import styles from "./DomainSolarSystem.module.css";

/*
 * Ported from reference/vcurx-solar-system.html. React renders the structure once;
 * everything that moves is written straight to the DOM and canvases from one
 * requestAnimationFrame loop, so a frame never costs a render.
 */

const ORBIT_FR = [0.36, 0.55, 0.76, 0.97];
const START = [0.9, 2.6, 4.25, 5.75];
/** Atmosphere halo beyond the disc, in planet radii. */
const ATM_PAD = 0.14;
/** Planet canvases are per-pixel shaded every frame; past 1.5× the cost outruns the gain. */
const MAX_PLANET_DPR = 1.5;
const TRAIL_SEGMENTS = 30;

type Look = { atm: [number, number, number]; atmS: number; limb: number; spin: number; cloudSpin?: number };

const LOOK: Record<PlanetKind, Look> = {
  earth: { atm: [95, 160, 255], atmS: 1.0, limb: 0.18, spin: 1 / 38, cloudSpin: 1 / 31 },
  ice: { atm: [130, 150, 255], atmS: 0.55, limb: 0.5, spin: 1 / 26 },
  ringed: { atm: [235, 215, 170], atmS: 0.18, limb: 0.45, spin: 1 / 30 },
  mars: { atm: [235, 160, 120], atmS: 0.22, limb: 0.15, spin: 1 / 46 },
};

/** Per-pixel sphere projection for one planet canvas, built on resize and reused every frame. */
type Gfx = {
  C: number;
  N: number;
  img: ImageData;
  VZ: Float32Array;
  VX: Float32Array;
  VY: Float32Array;
  NX: Float32Array;
  NY: Float32Array;
  NZ: Float32Array;
  LON: Float32Array;
  ROW: Int32Array;
  AA: Float32Array;
  RIM: Float32Array;
  RHO: Float32Array;
  RX: Float32Array;
  RZ: Float32Array;
  /** Only the pixels that can ever be painted, so the loop skips the empty corners. */
  ACT: Int32Array;
};

type Moon = { el: HTMLSpanElement; phi: number; w: number; lane: number };

type Body = Look & {
  domain: SolarDomain;
  idx: number;
  ring: boolean;
  el: HTMLButtonElement;
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  moons: Moon[];
  theta: number;
  f: number;
  spinU: number;
  cloudU: number;
  a: number;
  b: number;
  size: number;
  omega: number;
  moonBase: number;
  gfx?: Gfx;
  tex?: PlanetTexture;
  backPath: Path2D;
  frontPath: Path2D;
  /** Stroke styles decided once, so the frame loop builds no strings for them. */
  orbitSelected: string;
  trail: string[];
  trailDimmed: string[];
};

const tools = (n: number) => `${n} ${n === 1 ? "tool" : "tools"}`;

type DomainSolarSystemProps = {
  /** Omit where the page already names the section above it. */
  title?: string;
};

export function DomainSolarSystem({ title }: DomainSolarSystemProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const sunLabelRef = useRef<HTMLDivElement>(null);
  const sunCanvasRef = useRef<HTMLCanvasElement>(null);
  const swatchRef = useRef<HTMLCanvasElement>(null);
  const planetRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const gfxRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const moonRefs = useRef<(HTMLSpanElement | null)[][]>(DOMAINS.map(() => []));

  // The loop reads these every frame; state alone would only reach it on the next render.
  const selectedRef = useRef<number | null>(null);
  const hoveredRef = useRef<number | null>(null);
  const lastFocusRef = useRef<number | null>(null);

  const [selected, setSelected] = useState<number | null>(null);
  // What the panel shows. It outlives `selected` so the panel keeps its content while it slides away.
  const [shown, setShown] = useState(0);
  const [ready, setReady] = useState(false);
  const titleId = useId();

  const close = useCallback(() => {
    if (selectedRef.current === null) return;
    selectedRef.current = null;
    setSelected(null);
    const i = lastFocusRef.current;
    if (i !== null) planetRefs.current[i]?.focus({ preventScroll: true });
  }, []);

  const select = useCallback(
    (i: number) => {
      if (selectedRef.current === i) {
        close();
        return;
      }
      lastFocusRef.current = i;
      selectedRef.current = i;
      setSelected(i);
      setShown(i);
    },
    [close],
  );

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const back = backRef.current;
    const front = frontRef.current;
    const sunEl = sunRef.current;
    const sunLabel = sunLabelRef.current;
    const sunCanvas = sunCanvasRef.current;
    const bctx = back?.getContext("2d");
    const fctx = front?.getContext("2d");
    if (!section || !stage || !back || !front || !sunEl || !sunLabel || !sunCanvas || !bctx || !fctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let W = 0, H = 0, cx = 0, cy = 0, dpr = 1, SE = 0.37, CE = Math.sqrt(1 - SE * SE);

    const bodies: Body[] = [];
    DOMAINS.forEach((domain, i) => {
      const el = planetRefs.current[i];
      const cv = gfxRefs.current[i];
      const ctx = cv?.getContext("2d");
      if (!el || !cv || !ctx) return;
      const [r, g, b] = hexRgb(domain.color);
      const moons: Moon[] = [];
      moonRefs.current[i].forEach((moonEl, m) => {
        if (!moonEl) return;
        moons.push({
          el: moonEl,
          phi: (m / domain.count) * Math.PI * 2 + i,
          w: ((Math.PI * 2) / (6 + m * 1.2)) * (m % 3 === 2 ? -1 : 1),
          lane: m,
        });
      });
      const trail: string[] = [];
      const trailDimmed: string[] = [];
      for (let j = 0; j < TRAIL_SEGMENTS; j++) {
        const q = j / TRAIL_SEGMENTS;
        trail.push(`rgba(${r},${g},${b},${(q * q * 0.4).toFixed(3)})`);
        trailDimmed.push(`rgba(${r},${g},${b},${(q * q * 0.4 * 0.3).toFixed(3)})`);
      }
      bodies.push({
        ...LOOK[domain.kind],
        domain,
        idx: i,
        ring: domain.kind === "ringed",
        el,
        cv,
        ctx,
        moons,
        theta: START[i],
        f: 1,
        spinU: Math.random(),
        cloudU: 0,
        a: 0,
        b: 0,
        size: 0,
        omega: 0,
        moonBase: 0,
        backPath: new Path2D(),
        frontPath: new Path2D(),
        orbitSelected: `rgba(${r},${g},${b},0.45)`,
        trail,
        trailDimmed,
      });
    });

    function buildGfx(p: Body) {
      const r = p.size / 2, E = p.ring ? ROUT + 0.05 : 1 + ATM_PAD;
      const pdpr = Math.min(dpr, MAX_PLANET_DPR), C = Math.ceil(2 * E * r * pdpr), N = C * C, R = r * pdpr, c = C / 2;
      p.cv.width = p.cv.height = C;
      p.cv.style.width = p.cv.style.height = `${C / pdpr}px`;
      const g: Gfx = {
        C,
        N,
        img: p.ctx.createImageData(C, C),
        VZ: new Float32Array(N).fill(-1),
        VX: new Float32Array(N),
        VY: new Float32Array(N),
        NX: new Float32Array(N),
        NZ: new Float32Array(N),
        LON: new Float32Array(N),
        ROW: new Int32Array(N),
        NY: new Float32Array(N),
        AA: new Float32Array(N),
        RIM: new Float32Array(N),
        RHO: new Float32Array(N),
        RX: new Float32Array(N),
        RZ: new Float32Array(N),
        ACT: new Int32Array(0),
      };
      for (let iy = 0; iy < C; iy++) {
        for (let ix = 0; ix < C; ix++) {
          const k = iy * C + ix, sx = (ix + 0.5 - c) / R, sy = (iy + 0.5 - c) / R;
          const rr = sx * sx + sy * sy, rl = Math.sqrt(rr);
          if (rr < 1) {
            const vz = Math.sqrt(1 - rr), Nx = sx, Ny = -sy * CE + vz * SE, Nz = sy * SE + vz * CE;
            g.VZ[k] = vz; g.VX[k] = sx; g.VY[k] = sy; g.NX[k] = Nx; g.NY[k] = Ny; g.NZ[k] = Nz;
            g.LON[k] = Math.atan2(Nx, Nz) / (2 * Math.PI) + 0.5;
            g.ROW[k] = clamp(Math.floor((0.5 - Math.asin(clamp(Ny, -1, 1)) / Math.PI) * TH), 0, TH - 1) * TW;
            g.AA[k] = clamp((1 - rl) * R + 0.5, 0, 1);
          } else if (rl < 1 + ATM_PAD) {
            const f = 1 - (rl - 1) / ATM_PAD, nx = sx / rl, ny = sy / rl;
            g.RIM[k] = f * f * f; g.NX[k] = nx; g.NY[k] = -ny * CE; g.NZ[k] = ny * SE;
            g.AA[k] = clamp((1 - rl) * R + 0.5, 0, 1);
          }
          if (p.ring) {
            const X = sx, Z = sy / SE, rho = Math.hypot(X, Z);
            if (rho > RIN && rho < ROUT) { g.RHO[k] = rho; g.RX[k] = X; g.RZ[k] = Z; }
          }
        }
      }
      const act: number[] = [];
      for (let k = 0; k < N; k++) if (g.VZ[k] >= 0 || g.RIM[k] > 0 || g.RHO[k] > 0) act.push(k);
      g.ACT = Int32Array.from(act);
      p.gfx = g;
    }

    function renderPlanet(p: Body) {
      const g = p.gfx, t = p.tex;
      if (!g || !t) return;
      const buf = g.img.data, tex = t.rgb, clouds = t.cloud, spec = t.spec, ring = t.ring, nightTex = t.night;
      const ct = Math.cos(p.theta), st = Math.sin(p.theta);
      // The true sun direction, nudged toward the viewer so the near side never goes fully black.
      let Lx = -ct, Ly = 0.28 * SE, Lz = -st + 0.28 * CE;
      const Ll = Math.hypot(Lx, Ly, Lz);
      Lx /= Ll; Ly /= Ll; Lz /= Ll;
      let hx = -ct, hy = -st * SE, hz = -st * CE + 1;
      const hl = Math.hypot(hx, hy, hz) || 1;
      hx /= hl; hy /= hl; hz /= hl;
      const su = p.spinU, cu = p.cloudU, limb = p.limb, atmS = p.atmS, ar = p.atm[0], ag = p.atm[1], ab = p.atm[2];
      const { VZ, VX, VY, NX, NY, NZ, LON, ROW, AA, RIM, RHO, RX, RZ, ACT } = g, NA = ACT.length;
      for (let q0 = 0; q0 < NA; q0++) {
        const k = ACT[q0], o = k * 4, vz = VZ[k];
        let pr = 0, pg = 0, pb = 0, pa = 0;
        if (vz >= 0) {
          const d = NX[k] * Lx + NY[k] * Ly + NZ[k] * Lz;
          let u = LON[k] + su;
          u -= Math.floor(u);
          const ti = ROW[k] + ((u * TW) | 0), t3 = ti * 3;
          let r = tex[t3], gg = tex[t3 + 1], b = tex[t3 + 2], sm = spec ? spec[ti] / 255 : 0;
          if (clouds) {
            let u2 = LON[k] + cu;
            u2 -= Math.floor(u2);
            const ca = clouds[ROW[k] + ((u2 * TW) | 0)] / 255;
            r += (246 - r) * ca; gg += (248 - gg) * ca; b += (252 - b) * ca; sm *= 1 - ca;
          }
          let lit = d + 0.07;
          lit = lit > 0 ? Math.pow(lit / 1.07, 0.8) * 1.12 : 0;
          lit = lit * (1 - limb + limb * vz) + 0.03;
          r *= lit; gg *= lit; b *= lit;
          if (nightTex && d < 0.05) {
            const nl = (nightTex[ti] / 255) * smooth(0.05, -0.2, d);
            r += 255 * nl * 0.9; gg += 190 * nl * 0.9; b += 110 * nl * 0.9;
          }
          if (atmS) {
            const q = 1 - vz, kk = q * q * q * Math.max(0, d + 0.3) * atmS;
            r += ar * kk; gg += ag * kk; b += ab * kk;
          }
          if (sm > 0 && d > 0) {
            const nh = VX[k] * hx + VY[k] * hy + vz * hz;
            if (nh > 0.9) {
              const s = Math.pow(nh, 90) * 170 * sm;
              r += s * 0.95; gg += s; b += s;
            }
          }
          pr = r; pg = gg; pb = b; pa = AA[k];
        } else if (atmS && RIM[k] > 0) {
          const d = NX[k] * Lx + NY[k] * Ly + NZ[k] * Lz;
          pr = ar; pg = ag; pb = ab; pa = RIM[k] * clamp(d + 0.35, 0, 1) * atmS * 0.9;
        }
        let R = pr, G = pg, B = pb, A = pa;
        if (ring && RHO[k] > 0) {
          const ri = (((RHO[k] - RIN) / (ROUT - RIN)) * RN) | 0, ra = ring.a[ri];
          if (ra > 0) {
            const X = RX[k], Z = RZ[k], pl = X * Lx + Z * Lz;
            // The planet's shadow falls across the rings on the side away from the sun.
            const sh = pl < 0 && X * X + Z * Z - pl * pl < 1 ? 0.08 : 0.9;
            const rr = ring.col[ri * 3] * sh, rg = ring.col[ri * 3 + 1] * sh, rb = ring.col[ri * 3 + 2] * sh;
            const inFront = vz < 0 || Z * CE > vz;
            let tr, tg, tb, ta, br, bg, bb, ba;
            if (inFront) { tr = rr; tg = rg; tb = rb; ta = ra; br = pr; bg = pg; bb = pb; ba = pa; }
            else { tr = pr; tg = pg; tb = pb; ta = pa; br = rr; bg = rg; bb = rb; ba = ra; }
            A = ta + ba * (1 - ta);
            if (A > 0) {
              const w1 = ta / A, w2 = (ba * (1 - ta)) / A;
              R = tr * w1 + br * w2; G = tg * w1 + bg * w2; B = tb * w1 + bb * w2;
            }
          }
        }
        buf[o] = R; buf[o + 1] = G; buf[o + 2] = B; buf[o + 3] = A * 255;
      }
      p.ctx.putImageData(g.img, 0, 0);
    }

    function layout() {
      W = stage!.clientWidth;
      H = stage!.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [back!, front!]) { c.width = W * dpr; c.height = H * dpr; }
      bctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const narrow = W < 700;
      SE = narrow ? 0.6 : 0.36;
      CE = Math.sqrt(1 - SE * SE);
      const A = Math.min(W * (narrow ? 0.44 : 0.45), 660, (H * 0.39) / SE);
      const k = clamp(W / 1150, 0.62, 1);
      cx = W / 2;
      cy = H / 2;
      const sunSize = clamp(A * 0.26, 58, 150);
      sunEl!.style.setProperty("--sun", `${sunSize}px`);
      sunLabel!.style.setProperty("--sun", `${sunSize}px`);
      renderSun(sunCanvas!, sunSize, dpr);
      bodies.forEach((p, i) => {
        p.a = A * ORBIT_FR[i];
        p.b = p.a * SE;
        p.size = (38 + 12 * Math.sqrt(p.domain.count)) * k;
        p.el.style.width = p.el.style.height = `${p.size}px`;
        p.omega = (Math.PI * 2) / (32 * Math.pow(ORBIT_FR[i] / ORBIT_FR[0], 1.5));
        // A ringed planet's moons orbit outside its rings.
        p.moonBase = p.ring ? (p.size / 2) * 2.5 : p.size / 2 + 10 * k;
        buildGfx(p);
        // Split each orbit into the half behind the sun and the half in front of it.
        p.backPath = new Path2D();
        p.frontPath = new Path2D();
        const S = 180;
        for (let s = 0; s < S; s++) {
          const t0 = (s / S) * Math.PI * 2, t1 = ((s + 1) / S) * Math.PI * 2;
          const path = Math.sin((t0 + t1) / 2) < 0 ? p.backPath : p.frontPath;
          path.moveTo(cx + p.a * Math.cos(t0), cy + p.b * Math.sin(t0));
          path.lineTo(cx + p.a * Math.cos(t1), cy + p.b * Math.sin(t1));
        }
      });
    }

    // ---------- loop ----------
    let raf = 0;
    let running = false;
    let last = 0;

    function draw(dt: number) {
      const sel = selectedRef.current, hov = hoveredRef.current;
      bctx!.clearRect(0, 0, W, H);
      fctx!.clearRect(0, 0, W, H);
      bctx!.lineCap = fctx!.lineCap = "round";
      for (const p of bodies) {
        const isSel = sel === p.idx;
        bctx!.strokeStyle = fctx!.strokeStyle = isSel ? p.orbitSelected : "rgba(243,237,226,0.08)";
        bctx!.lineWidth = fctx!.lineWidth = isSel ? 1.2 : 1;
        bctx!.stroke(p.backPath);
        fctx!.stroke(p.frontPath);

        const target = reduce || sel !== null ? 0 : hov === p.idx ? 0.1 : 1;
        p.f += (target - p.f) * Math.min(1, dt * 3.5);
        p.theta += p.omega * p.f * dt;
        if (!reduce) {
          p.spinU += p.spin * dt;
          if (p.cloudSpin) p.cloudU += p.cloudSpin * dt;
        }

        const st = Math.sin(p.theta), ct = Math.cos(p.theta);
        const x = cx + p.a * ct, y = cy + p.b * st, depth = (st + 1) / 2;
        p.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${0.86 + 0.2 * depth})`;
        p.el.style.zIndex = st < 0 ? "2" : "7";
        p.el.style.setProperty("--o", (0.78 + 0.22 * depth).toFixed(3));
        const lx = -ct, ly = -st * SE, ll = Math.hypot(lx, ly) || 1;
        p.el.style.setProperty("--mlx", (lx / ll).toFixed(3));
        p.el.style.setProperty("--mly", (ly / ll).toFixed(3));

        // A faint trail behind the planet, split across the two orbit canvases like the orbit itself.
        const span = 0.8 - p.idx * 0.1;
        const trail = sel !== null && !isSel ? p.trailDimmed : p.trail;
        for (let j = 0; j < TRAIL_SEGMENTS; j++) {
          const t0 = p.theta - span * (1 - j / TRAIL_SEGMENTS), t1 = p.theta - span * (1 - (j + 1) / TRAIL_SEGMENTS);
          const c = Math.sin((t0 + t1) / 2) < 0 ? bctx! : fctx!;
          c.strokeStyle = trail[j];
          c.lineWidth = 1 + (1.2 * j) / TRAIL_SEGMENTS;
          c.beginPath();
          c.moveTo(cx + p.a * Math.cos(t0), cy + p.b * Math.sin(t0));
          c.lineTo(cx + p.a * Math.cos(t1), cy + p.b * Math.sin(t1));
          c.stroke();
        }

        renderPlanet(p);

        const ms = reduce ? 0 : isSel ? 1 : Math.max(p.f, 0.25);
        for (const m of p.moons) {
          m.phi += m.w * dt * ms;
          const rm = p.moonBase + (m.lane % 3) * 6, s = Math.sin(m.phi);
          m.el.style.transform = `translate(${(rm * Math.cos(m.phi)).toFixed(2)}px, ${(rm * SE * s).toFixed(2)}px)`;
          m.el.style.zIndex = s < 0 ? "0" : "3";
        }
      }
    }

    function frame(now: number) {
      if (!running) return;
      draw(Math.min((now - last) / 1000, 0.05));
      last = now;
      raf = requestAnimationFrame(frame);
    }

    // Runs only while the section is on screen and the tab is visible.
    let onScreen = false;
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = () => (onScreen && !document.hidden ? start() : stop());

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(section);
    document.addEventListener("visibilitychange", sync);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 150);
    };
    window.addEventListener("resize", onResize);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    layout();
    // Place everything once up front, so nothing sits unpositioned before the loop first runs.
    draw(0);

    // Build textures one planet at a time, yielding between them, so the page stays responsive.
    void (async () => {
      for (const p of bodies) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (disposed) return;
        p.tex = GEN[p.domain.kind]();
      }
      if (!disposed) setReady(true);
    })();

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      document.removeEventListener("keydown", onKey);
    };
  }, [close]);

  // A still of the planet as it looked when chosen, for the top of the panel.
  useEffect(() => {
    if (selected === null) return;
    const sw = swatchRef.current, src = gfxRefs.current[selected];
    if (!sw || !src || !src.width) return;
    const ring = DOMAINS[selected].kind === "ringed";
    const crop = ring ? 1 : 0.9;
    const s = src.width * crop, off = (src.width - s) / 2, hgt = ring ? s * 0.6 : s;
    sw.width = s;
    sw.height = hgt;
    sw.getContext("2d")?.drawImage(src, off, (src.height - hgt) / 2, s, hgt, 0, 0, s, hgt);
    sw.style.height = `${ring ? 64 : 72}px`;
  }, [selected]);

  const open = selected !== null;
  const panelDomain = DOMAINS[shown];

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      aria-labelledby={title ? `${titleId}-heading` : undefined}
      aria-label={title ? undefined : "Domains as a solar system"}
    >
      {title && <h2 id={`${titleId}-heading`} className={styles.title}>{title}</h2>}

      <div
        ref={stageRef}
        className={`${styles.stage} ${open ? styles.hasSelection : ""} ${ready ? styles.ready : ""}`}
        onClick={close}
      >
        <canvas ref={backRef} className={`${styles.orbits} ${styles.orbitsBack}`} aria-hidden="true" />
        <div ref={sunRef} className={styles.sun} aria-hidden="true">
          <canvas ref={sunCanvasRef} />
        </div>
        <div ref={sunLabelRef} className={styles.sunLabel} aria-hidden="true">
          <span className={styles.sunName}>VcurX</span>
          <span className={styles.sunSub}>AI core</span>
        </div>
        <canvas ref={frontRef} className={`${styles.orbits} ${styles.orbitsFront}`} aria-hidden="true" />

        {DOMAINS.map((domain, i) => (
          <button
            key={domain.id}
            ref={(el) => {
              planetRefs.current[i] = el;
            }}
            type="button"
            className={`${styles.planet} ${selected === i ? styles.isSelected : ""}`}
            style={{ "--c": domain.color } as CSSProperties}
            aria-label={`${domain.name}, ${tools(domain.count)}`}
            aria-expanded={selected === i}
            onPointerEnter={() => { hoveredRef.current = i; }}
            onPointerLeave={() => { if (hoveredRef.current === i) hoveredRef.current = null; }}
            onFocus={() => { hoveredRef.current = i; }}
            onBlur={() => { if (hoveredRef.current === i) hoveredRef.current = null; }}
            onClick={(e) => {
              e.stopPropagation();
              select(i);
            }}
          >
            <canvas
              ref={(el) => {
                gfxRefs.current[i] = el;
              }}
              className={styles.gfx}
            />
            {Array.from({ length: domain.count }, (_, m) => (
              <span
                key={m}
                ref={(el) => {
                  moonRefs.current[i][m] = el;
                }}
                className={styles.moon}
              />
            ))}
            <span className={styles.label}>
              <span className={styles.labelName}>{domain.name}</span>
              <span className={styles.labelCount}>{tools(domain.count)}</span>
            </span>
          </button>
        ))}
      </div>

      <aside
        className={`${styles.panel} ${open ? styles.open : ""}`}
        style={{ "--c": panelDomain.color } as CSSProperties}
        aria-hidden={!open}
        aria-labelledby={`${titleId}-panel`}
        inert={!open}
      >
        <button type="button" className={styles.panelClose} onClick={close}>
          Close
        </button>
        <canvas ref={swatchRef} className={styles.swatch} />
        <h3 id={`${titleId}-panel`} className={styles.panelTitle}>{panelDomain.name}</h3>
        <p className={styles.meta}>
          {tools(panelDomain.count)}
          {panelDomain.brand ? ` in ${panelDomain.brand}` : ""}
        </p>
        <p className={styles.desc}>{panelDomain.desc}</p>
        {panelDomain.groups.map((group, g) => (
          <div key={group.title ?? g} className={styles.group}>
            {group.title && <h4 className={styles.groupTitle}>{group.title}</h4>}
            <ul className={styles.groupList}>
              {group.items.map((item) => (
                <li key={item.slug}>
                  <Link href={`/products/${item.slug}`} className={styles.groupLink}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <Link href={`/domains/${panelDomain.id}`} className={styles.openDomain}>
          Open {panelDomain.name} domain
        </Link>
      </aside>
    </section>
  );
}
