/*
 * The zoom-out, as a camera pulling straight back. Every size and distance is real and
 * in astronomical units (AU, the Earth–Sun distance); the camera is described by how
 * much sky fits in half the screen's height, as a power of ten. Moving that exponent at
 * a steady pace is what makes Earth, the Moon's orbit, the planets and the galaxy each
 * get their turn, the way the Powers of Ten films read.
 */

export const EARTH_RADIUS = 4.26e-5;
export const MOON_RADIUS = 1.16e-5;
export const MOON_ORBIT = 2.57e-3;
export const SUN_RADIUS = 4.65e-3;
/** The Milky Way's disc: 50,000 light-years. */
export const GALAXY_RADIUS = 3.16e9;
/** Where the Sun sits in that disc: 26,000 of its 50,000 light-years out. */
export const SUN_IN_GALAXY = { radius: 0.53, angle: 2.3 };
/** The solar system is seen from above at an angle, so its circular orbits read as ellipses. */
export const ORBIT_TILT = Math.cos((62 * Math.PI) / 180);

export type Planet = { name: string; orbit: number; size: number; color: string; phase: number };

/** Orbits in AU; `size` is the dot's radius in pixels, since at these scales every planet is far under one. */
export const PLANETS: readonly Planet[] = [
  { name: "Mercury", orbit: 0.387, size: 1.5, color: "#bdb5aa", phase: 0.4 },
  { name: "Venus", orbit: 0.723, size: 2.1, color: "#ead29d", phase: 2.6 },
  { name: "Earth", orbit: 1, size: 2.3, color: "#74abff", phase: 0.9 },
  { name: "Mars", orbit: 1.524, size: 1.8, color: "#e3805a", phase: 4.1 },
  { name: "Jupiter", orbit: 5.2, size: 3.6, color: "#e6c9a4", phase: 5.3 },
  { name: "Saturn", orbit: 9.58, size: 3.2, color: "#f1ddaa", phase: 1.7 },
  { name: "Uranus", orbit: 19.2, size: 2.6, color: "#a4e2e8", phase: 3.3 },
  { name: "Neptune", orbit: 30.1, size: 2.6, color: "#7390ff", phase: 5.9 },
];
export const EARTH = PLANETS[2];

/** Radians per second Earth travels round the Sun; the rest follow Kepler, a^-1.5. */
const EARTH_ORBIT_SPEED = 0.22;

export function orbitAngle(planet: Planet, clock: number) {
  return planet.phase + clock * EARTH_ORBIT_SPEED * Math.pow(planet.orbit, -1.5);
}

/** Seconds: the wait on the whole Earth, the pull back to the planets, a pause there, then out to the galaxy. */
export const TIMING = { delay: 2.8, toPlanets: 3.8, pause: 1.8, toGalaxy: 4.6 };

export const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The camera's reach at `seconds` into the sequence, as log10 of the AU spanned by half
 * the screen's height: `earth` frames the whole globe, `planets` fits Neptune's orbit,
 * `galaxy` fits the Milky Way.
 */
export function zoomAt(seconds: number, earth: number, planets: number, galaxy: number) {
  let t = seconds - TIMING.delay;
  if (t <= 0) return { level: earth, done: false };
  if (t < TIMING.toPlanets) return { level: earth + (planets - earth) * easeInOut(t / TIMING.toPlanets), done: false };
  t -= TIMING.toPlanets;
  if (t < TIMING.pause) return { level: planets, done: false };
  t -= TIMING.pause;
  const p = Math.min(t / TIMING.toGalaxy, 1);
  return { level: planets + (galaxy - planets) * easeInOut(p), done: p >= 1 };
}

