/** One continuous journey: Earth → India → Delhi → the destination content. */
export const DELHI = { latitude: 28.6139, longitude: 77.2090 } as const;
const INDIA = { latitude: 20.5937, longitude: 78.9629 };
const INTRO_ROTATION_SECONDS = 4;
const INTRO_ROTATION_RADIANS = 1.6;
const RESTING_LONGITUDE = 0.65;

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** How far the whole-Earth view turns per second: one revolution in about three minutes. */
const SIDE_SPIN = 0.035;

/**
 * Where the whole Earth sits in its canvas, in the shader's units: a radius and a
 * vertical offset, both as fractions of the canvas height. A portrait canvas (narrow
 * screens, where the text sits above) lowers and shrinks the globe. Shared with the
 * zoom-out, which has to know exactly where the Earth it takes over from was drawn.
 */
export function sideFrame(aspect: number) {
  const portrait = aspect < 1;
  return { radius: portrait ? Math.min(0.3, aspect * 0.42) : 0.36, centerY: portrait ? -0.2 : 0 };
}

/**
 * The whole Earth, still in frame and slowly turning, with India facing the viewer
 * at the start. No scroll: the layout places the canvas so the globe sits beside the text.
 *
 * `scale` shrinks it for the zoom-out. At zero the planet is parked far below the
 * canvas, because even a radius of zero still leaves the atmosphere's glow drawn.
 */
export function sideCamera(aspect: number, still: boolean, rotationElapsed: number, scale = 1) {
  const frame = sideFrame(aspect);
  const turn = still ? 0 : rotationElapsed * SIDE_SPIN;
  return {
    radius: frame.radius * Math.max(scale, 1e-4),
    centerY: scale > 0 ? frame.centerY : -40,
    longitude: radians(INDIA.longitude) - 0.35 + turn,
    latitude: radians(18),
    // Most of the way to the arrival look: thinner clouds, city lights on the night side,
    // and without the opening's dark lower half, which would shade half the globe.
    approach: 0.7,
  };
}

export function earthCamera(aspect: number, progress: number, elapsed: number, still: boolean, rotationElapsed = elapsed) {
  const approach = smoothstep(0.04, 0.42, progress);
  const focus = smoothstep(0.44, 0.62, progress);
  const dive = smoothstep(0.60, 0.84, progress);
  const rise = still ? 1 : 1 - Math.pow(1 - clamp(elapsed / 3.4, 0, 1), 3);
  const initialRadius = clamp(aspect * 0.62, 0.52, 1.05);
  const top = mix(-0.04, -0.11, clamp((aspect - 0.6) / 1.0, 0, 1)) - (1 - rise) * 0.45;
  const countryRadius = clamp(aspect * 1.35, 0.6, 1.65);
  const radius = mix(initialRadius, countryRadius, approach)
    * mix(1, 1.25, focus) * (still ? 1 : Math.exp(dive * 1.6));
  const centerY = mix(top - initialRadius, 0, approach);
  const turn = still ? 1 : clamp((rotationElapsed - 0.35) / INTRO_ROTATION_SECONDS, 0, 1);
  const introLongitude = RESTING_LONGITUDE - INTRO_ROTATION_RADIANS * Math.pow(1 - turn, 3);
  const longitude = mix(mix(introLongitude, radians(INDIA.longitude), approach), radians(DELHI.longitude), focus);
  const latitude = mix(mix(0.1, radians(INDIA.latitude), approach), radians(DELHI.latitude), focus);

  return { radius, centerY, longitude, latitude, approach };
}
