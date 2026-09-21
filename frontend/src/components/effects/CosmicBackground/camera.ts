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
