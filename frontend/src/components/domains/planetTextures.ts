/**
 * Procedural planet surfaces and the sun, ported from reference/vcurx-solar-system.html.
 * Every constant here is the reference's own; change them there first.
 *
 * Textures are equirectangular, TW × TH, generated once on the main thread — the
 * caller yields between planets so building all four never freezes the page.
 */

export const TW = 512;
export const TH = 256;
/** Ring inner and outer radius, in planet radii, and its radial sample count. */
export const RIN = 1.2;
export const ROUT = 2.3;
export const RN = 512;

export type Noise = (x: number, y: number, z: number) => number;

export type Ring = { a: Float32Array; col: Float32Array };

export type PlanetTexture = {
  rgb: Uint8ClampedArray;
  cloud?: Uint8ClampedArray;
  spec?: Uint8ClampedArray;
  night?: Uint8ClampedArray;
  ring?: Ring;
};

export type PlanetKind = "earth" | "ice" | "ringed" | "mars";

type Rgb = [number, number, number];

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const hexRgb = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Seeded 3D Perlin noise, so every visitor sees the same planets. */
export function makeNoise(seed: number): Noise {
  const p = new Uint8Array(512);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const gr = (h: number, x: number, y: number, z: number) => {
    h &= 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return (h & 1 ? -u : u) + (h & 2 ? -v : v);
  };
  return (x, y, z) => {
    let X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z;
    X &= 255; Y &= 255; Z &= 255;
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(
      lerp(
        lerp(gr(p[AA], x, y, z), gr(p[BA], x - 1, y, z), u),
        lerp(gr(p[AB], x, y - 1, z), gr(p[BB], x - 1, y - 1, z), u),
        v,
      ),
      lerp(
        lerp(gr(p[AA + 1], x, y, z - 1), gr(p[BA + 1], x - 1, y, z - 1), u),
        lerp(gr(p[AB + 1], x, y - 1, z - 1), gr(p[BB + 1], x - 1, y - 1, z - 1), u),
        v,
      ),
      w,
    );
  };
}

export const fbm = (n: Noise, x: number, y: number, z: number, oct: number) => {
  let a = 0.5, f = 1, s = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += a * n(x * f, y * f, z * f);
    norm += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / norm;
};

/** The q-th quantile of a field, sampled every 7th value — plenty for thresholds. */
export const percentile = (arr: Float32Array, q: number) => {
  const step = 7;
  const smp = new Float32Array(Math.ceil(arr.length / step));
  for (let i = 0, j = 0; i < arr.length; i += step) smp[j++] = arr[i];
  smp.sort();
  return smp[Math.floor(q * (smp.length - 1))];
};

const eachTexel = (fn: (k: number, x: number, y: number, z: number, lat: number, lon: number) => void) => {
  for (let j = 0; j < TH; j++) {
    const lat = Math.PI / 2 - ((j + 0.5) / TH) * Math.PI;
    const cl = Math.cos(lat), y = Math.sin(lat);
    for (let i = 0; i < TW; i++) {
      const lon = ((i + 0.5) / TW) * Math.PI * 2 - Math.PI;
      fn(j * TW + i, Math.sin(lon) * cl, y, Math.cos(lon) * cl, lat, lon);
    }
  }
};

const put = (rgb: Uint8ClampedArray, k: number, r: number, g: number, b: number) => {
  rgb[k * 3] = r;
  rgb[k * 3 + 1] = g;
  rgb[k * 3 + 2] = b;
};

const mixc = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ---------- surface textures, modelled on real planets ----------

export const GEN: Record<PlanetKind, () => PlanetTexture> = {
  earth() {
    const N = TW * TH, n1 = makeNoise(11), n2 = makeNoise(23), n3 = makeNoise(37), n4 = makeNoise(41);
    const h = new Float32Array(N), c = new Float32Array(N), m = new Float32Array(N), LAT = new Float32Array(N);
    eachTexel((k, x, y, z, lat) => {
      const wx = fbm(n1, x * 1.3 + 3.1, y * 1.3, z * 1.3, 3);
      const wy = fbm(n1, x * 1.3, y * 1.3 + 7.7, z * 1.3, 3);
      const wz = fbm(n1, x * 1.3, y * 1.3, z * 1.3 + 5.3, 3);
      h[k] = fbm(n2, (x + wx) * 1.7, (y + wy) * 1.7, (z + wz) * 1.7, 6);
      c[k] = fbm(n3, (x + wy * 0.8) * 2.2, (y + wz * 0.5) * 3.2, (z + wx * 0.8) * 2.2, 5);
      m[k] = fbm(n4, x * 2.6, y * 2.6, z * 2.6, 3);
      LAT[k] = lat;
    });
    const sea = percentile(h, 0.66), lo = percentile(h, 0.03), hi = percentile(h, 0.995), cth = percentile(c, 0.5);
    const rgb = new Uint8ClampedArray(N * 3), cloud = new Uint8ClampedArray(N);
    const spec = new Uint8ClampedArray(N), night = new Uint8ClampedArray(N);
    const n5 = makeNoise(61);
    for (let k = 0; k < N; k++) {
      const al = Math.abs(LAT[k]) * 57.3;
      let col: Rgb;
      if (h[k] < sea) {
        const t = Math.pow(clamp((sea - h[k]) / (sea - lo), 0, 1), 0.55);
        col = mixc([40, 96, 118], [8, 26, 58], t);
        spec[k] = 255;
      } else {
        const e = clamp((h[k] - sea) / (hi - sea), 0, 1);
        const desert = clamp(Math.exp(-((al - 24) ** 2) / 120) * 1.1 + m[k] * 2.2, 0, 1);
        col = mixc([52, 84, 38], [104, 110, 62], smooth(0, 0.5, e));
        col = mixc(col, [190, 160, 110], desert * 0.85);
        col = mixc(col, [118, 100, 82], smooth(0.45, 0.8, e));
        col = mixc(col, [228, 226, 222], smooth(0.86, 0.98, e));
        col = mixc(col, [56, 74, 48], smooth(58, 70, al) * 0.6);
      }
      if (h[k] >= sea && al < 62) {
        const j = k % TW, lon = (j / TW) * 6.2832, lt = LAT[k];
        const city = fbm(n5, Math.sin(lon) * Math.cos(lt) * 22, Math.sin(lt) * 22, Math.cos(lon) * Math.cos(lt) * 22, 2);
        night[k] = 255 * smooth(0.22, 0.42, city) * (1 - smooth(0.25, 0.7, clamp((h[k] - sea) / (hi - sea), 0, 1)));
      }
      const ice = smooth(70, 76, al + m[k] * 22);
      col = mixc(col, [236, 240, 244], ice);
      if (ice > 0.5) spec[k] = 0;
      put(rgb, k, col[0], col[1], col[2]);
      const band = 0.75 + 0.35 * Math.exp(-((al - 58) ** 2) / 200) + 0.2 * Math.exp(-(al ** 2) / 60);
      cloud[k] = 255 * smooth(cth, cth + 0.2, c[k]) * clamp(band, 0, 1) * 0.92;
    }
    return { rgb, cloud, spec, night };
  },

  /** Neptune-like ice giant, cooled toward violet. */
  ice() {
    const N = TW * TH, n1 = makeNoise(5), n2 = makeNoise(17), n3 = makeNoise(29);
    const b = new Float32Array(N), s = new Float32Array(N), LAT = new Float32Array(N), LON = new Float32Array(N);
    eachTexel((k, x, y, z, lat, lon) => {
      const w = fbm(n1, x * 2.2, y * 2.2, z * 2.2, 3);
      b[k] = fbm(n2, x * 0.7, (y + w * 0.07) * 8, z * 0.7, 4);
      s[k] = fbm(n3, x * 1.6 + w, y * 26, z * 1.6, 3);
      LAT[k] = lat;
      LON[k] = lon;
    });
    const b0 = percentile(b, 0.04), b1 = percentile(b, 0.96), s0 = percentile(s, 0.88), s1 = percentile(s, 0.995);
    const rgb = new Uint8ClampedArray(N * 3);
    for (let k = 0; k < N; k++) {
      const t = clamp((b[k] - b0) / (b1 - b0), 0, 1), lat = LAT[k];
      let col = t < 0.5 ? mixc([30, 40, 118], [62, 80, 178], t * 2) : mixc([62, 80, 178], [118, 132, 214], (t - 0.5) * 2);
      const cir = smooth(s0, s1, s[k]) * Math.exp(-((Math.abs(lat) - 0.5) ** 2) / 0.05);
      col = mixc(col, [226, 232, 255], cir * 0.8);
      let dl = LON[k] - 1.1;
      dl -= Math.round(dl / (2 * Math.PI)) * 2 * Math.PI;
      const e = ((dl * Math.cos(lat)) / 0.26) ** 2 + ((lat + 0.36) / 0.1) ** 2;
      col = mixc(col, [18, 22, 70], smooth(1, 0.25, e) * 0.85);
      const e2 = (((dl - 0.05) * Math.cos(lat)) / 0.16) ** 2 + ((lat + 0.5) / 0.04) ** 2;
      col = mixc(col, [230, 236, 255], smooth(1, 0.2, e2) * 0.8);
      const pole = smooth(1.05, 1.5, Math.abs(lat)) * 0.35;
      col = mixc(col, [22, 30, 90], pole);
      put(rgb, k, col[0], col[1], col[2]);
    }
    return { rgb };
  },

  /** Saturn-like. */
  ringed() {
    const N = TW * TH, n1 = makeNoise(3), n2 = makeNoise(13), n3 = makeNoise(19);
    const b = new Float32Array(N), f = new Float32Array(N), LAT = new Float32Array(N);
    eachTexel((k, x, y, z, lat) => {
      const w = fbm(n1, x * 3, y * 3, z * 3, 3);
      b[k] = fbm(n2, x * 0.35, (y + w * 0.025) * 13, z * 0.35, 5) + Math.sin(lat * 18) * 0.06;
      f[k] = fbm(n3, x * 6, y * 40, z * 6, 2);
      LAT[k] = lat;
    });
    const b0 = percentile(b, 0.03), b1 = percentile(b, 0.97);
    const rgb = new Uint8ClampedArray(N * 3);
    const P: Rgb[] = [[172, 136, 88], [204, 174, 120], [228, 206, 160], [242, 230, 200]];
    for (let k = 0; k < N; k++) {
      const t = clamp((b[k] - b0) / (b1 - b0), 0, 1) * 2.999, i = Math.floor(t);
      let col = mixc(P[i], P[i + 1], t - i);
      col = mixc(col, [150, 158, 160], smooth(1.0, 1.4, Math.abs(LAT[k])) * 0.6);
      const g = 1 + f[k] * 0.12;
      put(rgb, k, col[0] * g, col[1] * g, col[2] * g);
    }
    return { rgb, ring: genRing() };
  },

  mars() {
    const N = TW * TH, n1 = makeNoise(7), n2 = makeNoise(31), n3 = makeNoise(43), n4 = makeNoise(53);
    const h = new Float32Array(N), d = new Float32Array(N), cr = new Float32Array(N);
    const LAT = new Float32Array(N), W = new Float32Array(N);
    eachTexel((k, x, y, z, lat) => {
      const w = fbm(n1, x * 1.6, y * 1.6, z * 1.6, 3);
      h[k] = fbm(n2, (x + w) * 2.2, (y + w) * 2.2, (z - w) * 2.2, 6);
      d[k] = fbm(n3, (x - w * 0.6) * 1.4, y * 1.4, (z + w * 0.6) * 1.4, 5);
      cr[k] = fbm(n4, x * 11, y * 11, z * 11, 2);
      LAT[k] = lat;
      W[k] = w;
    });
    const d0 = percentile(d, 0.55), d1 = percentile(d, 0.85);
    const h0 = percentile(h, 0.05), h1 = percentile(h, 0.95), c0 = percentile(cr, 0.93);
    const rgb = new Uint8ClampedArray(N * 3);
    for (let k = 0; k < N; k++) {
      const e = clamp((h[k] - h0) / (h1 - h0), 0, 1);
      let col = mixc([160, 78, 44], [214, 138, 88], e);
      col = mixc(col, [92, 50, 34], smooth(d0, d1, d[k]) * 0.8);
      col = mixc(col, [70, 38, 26], smooth(c0, c0 + 0.08, cr[k]) * 0.45);
      const lat = LAT[k] + W[k] * 0.12;
      col = mixc(col, [240, 234, 226], smooth(1.2, 1.3, lat) + smooth(-1.32, -1.42, lat));
      put(rgb, k, col[0], col[1], col[2]);
    }
    return { rgb };
  },
};

/** Saturn's rings as radial density and colour: C ring, B ring, Cassini division, A ring with the Encke gap. */
export function genRing(): Ring {
  const n = makeNoise(99), a = new Float32Array(RN), col = new Float32Array(RN * 3);
  for (let i = 0; i < RN; i++) {
    const rho = RIN + ((i + 0.5) / RN) * (ROUT - RIN);
    const v = fbm(n, rho * 38, 0.37, 0.71, 4) * 1.6;
    let dens = 0;
    let c: Rgb = [0, 0, 0];
    if (rho < 1.24) dens = 0;
    else if (rho < 1.52) { dens = 0.16 + 0.1 * v; c = [138, 128, 114]; }
    else if (rho < 1.95) { dens = 0.82 + 0.18 * v; c = [216, 198, 160]; }
    else if (rho < 2.02) { dens = 0.05; c = [110, 100, 88]; }
    else if (rho < 2.27) {
      dens = 0.58 + 0.16 * v;
      c = [192, 178, 150];
      if (Math.abs(rho - 2.21) < 0.008) dens = 0.06;
    }
    a[i] = clamp(dens, 0, 0.95);
    col[i * 3] = c[0];
    col[i * 3 + 1] = c[1];
    col[i * 3 + 2] = c[2];
  }
  return { a, col };
}

/**
 * The sun, drawn once per resize: limb darkening from a cream-white centre to an
 * orange edge, with two octaves of granulation. It turns by CSS, not by redrawing.
 */
export function renderSun(canvas: HTMLCanvasElement, size: number, dpr: number) {
  const C = Math.round(size * dpr);
  canvas.width = canvas.height = C;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(C, C), buf = img.data, R = C / 2, n = makeNoise(77);
  for (let iy = 0; iy < C; iy++) {
    for (let ix = 0; ix < C; ix++) {
      const sx = (ix + 0.5 - R) / R, sy = (iy + 0.5 - R) / R, rr = sx * sx + sy * sy, o = (iy * C + ix) * 4;
      if (rr >= 1) { buf[o + 3] = 0; continue; }
      const vz = Math.sqrt(1 - rr), mu = Math.pow(1 - vz, 1.4);
      const gran = 1 + 0.09 * fbm(n, sx * 14, sy * 14, vz * 14, 3) + 0.05 * fbm(n, sx * 4 + 9, sy * 4, vz * 4, 2);
      const I = (1 - 0.55 * (1 - vz)) * gran;
      buf[o] = lerp(255, 255, mu) * I;
      buf[o + 1] = lerp(246, 150, mu) * I;
      buf[o + 2] = lerp(222, 60, mu) * I;
      buf[o + 3] = 255 * clamp((1 - Math.sqrt(rr)) * R + 0.5, 0, 1);
    }
  }
  ctx.putImageData(img, 0, 0);
}
