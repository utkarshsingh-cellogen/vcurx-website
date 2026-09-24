import { createProgram } from "@/lib/webgl";
import {
  dustFragmentShader,
  hazeFragmentShader,
  hazeVertexShader,
  pointVertexShader,
  starFragmentShader,
} from "./shaders";

type Rgb = [number, number, number];

/** How one galaxy sits on the sky. Everything else about it grows from its seed. */
export type GalaxySpec = {
  seed: number;
  /** Degrees; the major axis rises to the right for positive values. */
  positionAngle: number;
  /** Degrees away from face-on. */
  inclination: number;
  /** 1 / tan(pitch): higher winds the arms tighter. */
  wind: number;
  /** Which way it turns. */
  mirror: 1 | -1;
  /** A small elliptical companion, in galaxy radii from the centre. */
  companion?: { x: number; y: number; size: number };
  /** The domain colour, as a CSS hex string; the outer disc takes its hue. */
  accent: string;
};

/** Where each galaxy's patch of sky sits, in CSS pixels from the canvas's top left. */
export type Slot = { x: number; y: number; width: number; height: number };

export type GalaxyRenderer = {
  layout(width: number, height: number, slots: readonly Slot[]): void;
  setActive(index: number | null): void;
  setVisible(visible: boolean): void;
  destroy(): void;
};

const MAX_PIXEL_RATIO = 2;
/** Galaxy radius as a share of its slot's width. Above half, because the discs lie on a diagonal. */
const RADIUS_OF_SLOT = 0.66;
/** How far the haze quad reaches, in galaxy radii. */
const HAZE_EXTENT = 1.25;
/** Radians per second the arms turn at rest. */
const PATTERN_SPEED = 0.028;
/** Seconds for the raised galaxy to settle into its new brightness, size and pace. */
const EASE_RATE = 5;

const DISK_STARS = 7400;
const BULGE_STARS = 2200;
const ARM_STARS = 950;
const DUST = 1800;

/** Andromeda's own palette: a warm core and a blue-violet disc. */
const CORE: Rgb = [1, 0.84, 0.62];
const DISC_BLUE: Rgb = [0.52, 0.6, 1];
const YOUNG_BLUE: Rgb = [0.66, 0.78, 1];
const NEBULA_PINK: Rgb = [1, 0.4, 0.62];
const DUST_BROWN: Rgb = [0.6, 0.44, 0.3];

const FLOATS_PER_POINT = 10;
const STRIDE = FLOATS_PER_POINT * 4;

/* ---------- colour ---------- */

function hexRgb(hex: string, fallback: Rgb): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** The site's accents are muted for text on black; starlight needs them richer and brighter. */
function vivid(c: Rgb): Rgb {
  const grey = (c[0] + c[1] + c[2]) / 3;
  const rich = c.map((v) => Math.max(0, grey + (v - grey) * 1.9)) as Rgb;
  const peak = Math.max(...rich, 1e-3);
  return rich.map((v) => v / peak) as Rgb;
}

/** Andromeda's blue-violet, leaning well towards the domain's own hue. */
const discTint = (spec: GalaxySpec) => mix(DISC_BLUE, vivid(hexRgb(spec.accent, DISC_BLUE)), 0.62);

/* ---------- star fields ---------- */

/** Small seeded generator, so a galaxy looks the same on every visit. */
function random(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  return { next, gauss };
}

/** An exponential disc cut off at `max`: most stars near the middle, thinning outward. */
function discRadius(u: number, scale: number, max: number) {
  return -scale * Math.log(1 - u * (1 - Math.exp(-max / scale)));
}

type Fields = { disk: Float32Array; arms: Float32Array; dust: Float32Array };

function buildFields(spec: GalaxySpec): Fields {
  const { next, gauss } = random(spec.seed);
  const tint = discTint(spec);
  const sinPitch = 1 / Math.sqrt(1 + spec.wind * spec.wind);
  /** The disc angle `across` galaxy radii off the centre of arm `k`, at radius `r`. */
  const onArm = (r: number, k: number, across: number) =>
    -spec.wind * Math.log(r / 0.1) + k * Math.PI + across / (r * sinPitch);

  const disk = new Float32Array((DISK_STARS + BULGE_STARS) * FLOATS_PER_POINT);
  let o = 0;
  const put = (f: Float32Array, values: number[]) => {
    f.set(values, o);
    o += FLOATS_PER_POINT;
  };

  for (let i = 0; i < DISK_STARS; i++) {
    const r = 0.03 + discRadius(next(), 0.34, 1.02);
    const young = next() < 0.16;
    const warmth = Math.exp(-r / 0.2);
    const base = young ? mix(YOUNG_BLUE, tint, 0.35) : mix(tint, CORE, warmth * 0.9 + next() * 0.15);
    const size = young ? 1.3 + next() * 1.3 : 1 + next() ** 3 * 1.4;
    put(disk, [
      r, next() * Math.PI * 2, gauss() * 0.012, young ? 1 : 0.5,
      ...base, size,
      (young ? 0.34 : 0.22) + next() * 0.2, next(),
    ]);
  }
  for (let i = 0; i < BULGE_STARS; i++) {
    const r = Math.abs(gauss()) * 0.085 + 0.004;
    put(disk, [
      r, next() * Math.PI * 2, gauss() * 0.045, 0,
      ...mix(CORE, [1, 0.94, 0.84], next() * 0.5), 1 + next() * 0.9,
      0.2 + next() * 0.16, next(),
    ]);
  }

  // Young stars sit just downstream of the arm; the glowing gas they light, a little further.
  const arms = new Float32Array(ARM_STARS * FLOATS_PER_POINT);
  o = 0;
  for (let i = 0; i < ARM_STARS; i++) {
    const r = 0.16 + discRadius(next(), 0.5, 0.8);
    const nebula = next() < 0.26;
    const across = (nebula ? 0.018 : 0.01) + gauss() * 0.014;
    put(arms, [
      r, onArm(r, i & 1, across), gauss() * 0.008, 0,
      ...(nebula ? NEBULA_PINK : mix(YOUNG_BLUE, tint, 0.3)),
      nebula ? 2.4 + next() * 2.4 : 1.3 + next() * 1.5,
      nebula ? 0.3 + next() * 0.2 : 0.45 + next() * 0.35, next(),
    ]);
  }

  // Dust gathers on the upstream edge, where the gas piles into the arm; a fifth wanders off it.
  const dust = new Float32Array(DUST * FLOATS_PER_POINT);
  o = 0;
  for (let i = 0; i < DUST; i++) {
    const r = 0.12 + discRadius(next(), 0.4, 0.82);
    const stray = next() < 0.2;
    const across = -0.028 + gauss() * (stray ? 0.05 : 0.011);
    put(dust, [
      r, onArm(r, i & 1, across), gauss() * 0.006, 0,
      ...mix(DUST_BROWN, [0.42, 0.32, 0.24], next()), 3 + next() * 4,
      (stray ? 0.12 : 0.2) + next() * 0.16, next(),
    ]);
  }

  return { disk, arms, dust };
}

/* ---------- GL plumbing ---------- */

type Locations = Record<string, WebGLUniformLocation | null>;

function uniforms(gl: WebGLRenderingContext, program: WebGLProgram, names: readonly string[]): Locations {
  return Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)]));
}

const SHARED = ["uSky", "uIncl", "uMirror", "uPattern", "uWind", "uCenter", "uRadius", "uGain"] as const;
const POINT = [...SHARED, "uTime", "uClock", "uFlow", "uPointScale"] as const;
const HAZE = [...SHARED, "uExtent", "uCore", "uDiskTint", "uDust", "uCompanion"] as const;

/** A galaxy and the values that ease towards whichever one is raised. */
type Galaxy = {
  spec: GalaxySpec;
  tint: Rgb;
  sky: [number, number];
  incl: [number, number];
  ranges: { disk: [number, number]; arms: [number, number]; dust: [number, number] };
  slot: Slot | null;
  time: number;
  pattern: number;
  gain: number;
  scale: number;
  pace: number;
};

export function createGalaxyRenderer(
  canvas: HTMLCanvasElement,
  specs: readonly GalaxySpec[],
  { still }: { still: boolean },
): GalaxyRenderer | null {
  const context = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!context) return null;
  const gl: WebGLRenderingContext = context;

  const star = createProgram(gl, pointVertexShader, starFragmentShader);
  const dim = createProgram(gl, pointVertexShader, dustFragmentShader);
  const haze = createProgram(gl, hazeVertexShader, hazeFragmentShader);
  if (!star || !dim || !haze) return null;
  // Re-declared so the narrowing survives into the closures below.
  const starProgram: WebGLProgram = star;
  const dustProgram: WebGLProgram = dim;
  const hazeProgram: WebGLProgram = haze;

  const starU = uniforms(gl, starProgram, POINT);
  const dustU = uniforms(gl, dustProgram, POINT);
  const hazeU = uniforms(gl, hazeProgram, HAZE);

  // Every galaxy's particles share three buffers, one per pass, drawn by range.
  const fields = specs.map(buildFields);
  const pack = (pick: (f: Fields) => Float32Array) => {
    const parts = fields.map(pick);
    const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    const ranges: [number, number][] = [];
    let at = 0;
    for (const p of parts) {
      all.set(p, at);
      ranges.push([at / FLOATS_PER_POINT, p.length / FLOATS_PER_POINT]);
      at += p.length;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, all, gl.STATIC_DRAW);
    return { buffer, ranges };
  };
  const disk = pack((f) => f.disk);
  const arms = pack((f) => f.arms);
  const dust = pack((f) => f.dust);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const rad = Math.PI / 180;
  const galaxies: Galaxy[] = specs.map((spec, i) => ({
    spec,
    tint: discTint(spec),
    sky: [Math.cos(spec.positionAngle * rad), Math.sin(spec.positionAngle * rad)],
    incl: [Math.cos(spec.inclination * rad), Math.sin(spec.inclination * rad)],
    ranges: { disk: disk.ranges[i], arms: arms.ranges[i], dust: dust.ranges[i] },
    slot: null,
    // Start each one somewhere different in its turn, so they never move in step.
    time: spec.seed % 97,
    pattern: (spec.seed % 13) * 0.5,
    gain: 1,
    scale: 1,
    pace: 1,
  }));

  /* The attribute arrays each program needs; everything else is switched off between passes. */
  const pointAttribs = (program: WebGLProgram) =>
    (["aOrbit", "aLook", "aGlow"] as const).map((name, i) => ({
      loc: gl.getAttribLocation(program, name),
      size: i === 2 ? 2 : 4,
      offset: i * 16,
    }));
  const starAttribs = pointAttribs(starProgram);
  const dustAttribs = pointAttribs(dustProgram);
  const cornerLoc = gl.getAttribLocation(hazeProgram, "aCorner");
  const maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;

  function bindPoints(buffer: WebGLBuffer | null, attribs: ReturnType<typeof pointAttribs>) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (let i = 0; i < maxAttribs; i++) gl.disableVertexAttribArray(i);
    for (const a of attribs) {
      if (a.loc < 0) continue;
      gl.enableVertexAttribArray(a.loc);
      gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, STRIDE, a.offset);
    }
  }

  let width = 0;
  let height = 0;
  let ratio = 1;
  let active: number | null = null;
  let visible = false;
  let clock = 0;
  let last = 0;
  let frame = 0;
  let destroyed = false;

  function shared(u: Locations, g: Galaxy, center: [number, number], radius: [number, number]) {
    gl.uniform2f(u.uSky, g.sky[0], g.sky[1]);
    gl.uniform2f(u.uIncl, g.incl[0], g.incl[1]);
    gl.uniform1f(u.uMirror, g.spec.mirror);
    gl.uniform1f(u.uPattern, g.pattern);
    gl.uniform1f(u.uWind, g.spec.wind);
    gl.uniform2f(u.uCenter, center[0], center[1]);
    gl.uniform2f(u.uRadius, radius[0], radius[1]);
    gl.uniform1f(u.uGain, g.gain);
  }

  function drawPoints(
    program: WebGLProgram,
    u: Locations,
    g: Galaxy,
    center: [number, number],
    radius: [number, number],
    range: [number, number],
    flow: number,
    pointScale: number,
  ) {
    gl.useProgram(program);
    shared(u, g, center, radius);
    gl.uniform1f(u.uTime, g.time);
    gl.uniform1f(u.uClock, clock);
    gl.uniform1f(u.uFlow, flow);
    gl.uniform1f(u.uPointScale, pointScale);
    gl.drawArrays(gl.POINTS, range[0], range[1]);
  }

  function draw() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!width || !height) return;
    gl.enable(gl.BLEND);

    for (const g of galaxies) {
      if (!g.slot) continue;
      const px = g.slot.width * RADIUS_OF_SLOT * g.scale;
      const center: [number, number] = [
        ((g.slot.x + g.slot.width / 2) / width) * 2 - 1,
        1 - ((g.slot.y + g.slot.height / 2) / height) * 2,
      ];
      const radius: [number, number] = [(px / width) * 2, (px / height) * 2];
      // Stars grow a little with the galaxy, so a large one does not look like dust.
      const pointScale = ratio * Math.min(Math.max(px / 170, 0.8), 1.35);

      // 1. The smooth light, added.
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(hazeProgram);
      shared(hazeU, g, center, radius);
      gl.uniform1f(hazeU.uExtent, HAZE_EXTENT);
      gl.uniform3f(hazeU.uCore, CORE[0], CORE[1], CORE[2]);
      gl.uniform3f(hazeU.uDiskTint, g.tint[0], g.tint[1], g.tint[2]);
      gl.uniform3f(hazeU.uDust, DUST_BROWN[0], DUST_BROWN[1], DUST_BROWN[2]);
      const c = g.spec.companion;
      gl.uniform3f(hazeU.uCompanion, c?.x ?? 0, c?.y ?? 0, c?.size ?? 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      for (let i = 0; i < maxAttribs; i++) gl.disableVertexAttribArray(i);
      gl.enableVertexAttribArray(cornerLoc);
      gl.vertexAttribPointer(cornerLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // 2. The orbiting stars, added.
      bindPoints(disk.buffer, starAttribs);
      drawPoints(starProgram, starU, g, center, radius, g.ranges.disk, 1, pointScale);

      // 3. Dust, multiplied into everything behind it; alpha is left alone.
      gl.blendFuncSeparate(gl.DST_COLOR, gl.ZERO, gl.ZERO, gl.ONE);
      bindPoints(dust.buffer, dustAttribs);
      drawPoints(dustProgram, dustU, g, center, radius, g.ranges.dust, 0, pointScale);

      // 4. Young stars and glowing gas, added last so the dust does not dim them.
      gl.blendFunc(gl.ONE, gl.ONE);
      bindPoints(arms.buffer, starAttribs);
      drawPoints(starProgram, starU, g, center, radius, g.ranges.arms, 0, pointScale);
    }
  }

  /** Where each galaxy is heading, given which one is raised. */
  function targets(i: number) {
    if (active === null) return { gain: 1, scale: 1, pace: 1 };
    return i === active ? { gain: 1.3, scale: 1.08, pace: 2.6 } : { gain: 0.5, scale: 0.94, pace: 0.7 };
  }

  function step(now: number) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    const k = still ? 1 : 1 - Math.exp(-dt * EASE_RATE);

    galaxies.forEach((g, i) => {
      const t = targets(i);
      g.gain += (t.gain - g.gain) * k;
      g.scale += (t.scale - g.scale) * k;
      g.pace += (t.pace - g.pace) * k;
      if (!still) {
        g.time += dt * g.pace;
        g.pattern += dt * PATTERN_SPEED * g.pace;
      }
    });
    if (!still) clock += dt;

    draw();
    if (!still && visible && !destroyed) frame = requestAnimationFrame(step);
  }

  /** Still mode draws once per change; otherwise this (re)starts the loop. */
  function request() {
    if (destroyed || frame) return;
    if (!still && !visible) return;
    last = 0;
    frame = requestAnimationFrame(step);
  }

  return {
    layout(w, h, slots) {
      width = w;
      height = h;
      ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
      galaxies.forEach((g, i) => (g.slot = slots[i] ?? null));
      // Resizing the backing store clears it; paint straight away so there is no blank frame.
      draw();
      request();
    },
    setActive(index) {
      active = index;
      request();
    },
    setVisible(next) {
      visible = next;
      if (visible) request();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    destroy() {
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      gl.deleteBuffer(disk.buffer);
      gl.deleteBuffer(arms.buffer);
      gl.deleteBuffer(dust.buffer);
      gl.deleteBuffer(quad);
      gl.deleteProgram(starProgram);
      gl.deleteProgram(dustProgram);
      gl.deleteProgram(hazeProgram);
    },
  };
}
