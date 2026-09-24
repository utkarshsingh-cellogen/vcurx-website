/**
 * One short journey: the Earth's horizon under the wordmark pulls back into the whole
 * globe, which settles behind the destination content as a faint presence.
 */
const INTRO_ROTATION_SECONDS = 4;
const INTRO_ROTATION_RADIANS = 1.6;
const RESTING_LONGITUDE = 0.65;
/**
 * The face the whole globe settles on: Africa, Europe and India, as in the reference
 * still. It holds this face rather than spinning: a spin clocked from page load would
 * turn India away for anyone who lingered on the opening. The clouds still drift.
 */
const GLOBE_FACE = { latitude: 18, longitude: 52 };

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Where the whole globe sits once it has pulled back, in the shader's units: a radius
 * and a vertical offset, as fractions of the canvas height. It is centred, behind the
 * destination's words; a portrait screen narrows it so it still fits the width.
 */
function globeFrame(aspect: number) {
  return { radius: aspect < 1 ? Math.min(0.36, aspect * 0.46) : 0.36, centerY: 0 };
}

export function earthCamera(aspect: number, progress: number, elapsed: number, still: boolean, rotationElapsed = elapsed) {
  // Horizon to whole globe over the first half of the journey; the rest is the dimming.
  const pull = smoothstep(0.02, 0.55, progress);
  const rise = still ? 1 : 1 - Math.pow(1 - clamp(elapsed / 3.4, 0, 1), 3);
  const initialRadius = clamp(aspect * 0.62, 0.52, 1.05);
  const top = mix(-0.04, -0.11, clamp((aspect - 0.6) / 1.0, 0, 1)) - (1 - rise) * 0.45;
  const globe = globeFrame(aspect);

  // The same span as `--arrival` in Hero.module.css: the globe becomes the destination's
  // shadow, draining of colour and sinking back a little behind the words.
  const ghost = clamp((progress - 0.35) / 0.4, 0, 1);

  // The radius and the centre move together, so the horizon rises as it shrinks into a
  // globe rather than the planet sliding up behind a fixed edge.
  const radius = mix(initialRadius, globe.radius, pull) * (1 - 0.05 * ghost);
  const centerY = mix(top - initialRadius, globe.centerY, pull);

  const turn = still ? 1 : clamp((rotationElapsed - 0.35) / INTRO_ROTATION_SECONDS, 0, 1);
  const introLongitude = RESTING_LONGITUDE - INTRO_ROTATION_RADIANS * Math.pow(1 - turn, 3);
  const longitude = mix(introLongitude, radians(GLOBE_FACE.longitude), pull);
  const latitude = mix(0.1, radians(GLOBE_FACE.latitude), pull);

  // Most of the way to the lit look: thinner clouds, city lights on the night side, and
  // without the opening's dark lower half, which would shade half the globe.
  const approach = mix(0, 0.7, pull);

  return { radius, centerY, longitude, latitude, approach, ghost };
}
