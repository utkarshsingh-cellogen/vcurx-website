/*
 * Galaxy model, shared by every pass below.
 *
 * A galaxy is a thin disc seen at an angle. Points on the disc are written as a
 * radius and an angle in the disc's own plane, tilted away from the viewer by the
 * inclination, then turned to the galaxy's position angle on screen.
 *
 * The arms are a density wave rather than matter: a pair of logarithmic spirals
 * that turn slowly as a whole while the stars orbit faster underneath them. A star
 * brightens as it passes through an arm, so the arms keep their shape for ever
 * instead of winding up the way painted-on arms would under differential rotation.
 * Dust, young stars and glowing gas clouds belong to the wave, so they turn with it.
 */

const DISK = /* glsl */ `
  const float PI = 3.14159265;

  uniform vec2 uSky;      // cos, sin of the position angle
  uniform vec2 uIncl;     // cos, sin of the inclination
  uniform float uMirror;  // 1 or -1: which way the galaxy turns
  uniform float uPattern; // how far the arms have turned
  uniform float uWind;    // arm winding: 1 / tan(pitch angle)
  uniform float uArms;    // how many arms: 2, or 4 for the Milky Way
  uniform float uMinor;   // brightness of every other arm; 1 when all are equal
  uniform float uArmRoot; // the radius the arms leave from: the bar's end, when there is one
  uniform float uArmWidth;

  /* Where arm 0 crosses radius r, measured round the disc. */
  float armBase(float r) {
    return uPattern - uWind * log(max(r, 0.02) / uArmRoot);
  }

  /* Signed angle from the nearest arm; negative is upstream, where the gas arrives from. */
  float armAngle(float ang, float r) {
    float period = 2.0 * PI / uArms;
    return mod(ang - armBase(r) + period * 0.5, period) - period * 0.5;
  }

  /* 1 on the major arms, uMinor on the arms between them. */
  float armStrength(float ang, float r) {
    float period = 2.0 * PI / uArms;
    float index = floor((ang - armBase(r) + period * 0.5) / period);
    return mod(index, 2.0) < 0.5 ? 1.0 : uMinor;
  }

  /* The same offset as a distance across the arm, in galaxy radii. */
  float armDistance(float ang, float r) {
    return armAngle(ang, r) * r * inversesqrt(1.0 + uWind * uWind);
  }

  /* Disc coordinates to galaxy-space screen coordinates (y up). */
  vec2 project(vec3 disk) {
    disk.y *= uMirror;
    vec2 s = vec2(disk.x, disk.y * uIncl.x + disk.z * uIncl.y);
    return vec2(s.x * uSky.x - s.y * uSky.y, s.x * uSky.y + s.y * uSky.x);
  }
`;

/* ---------- stars and dust: one point per particle ---------- */

export const pointVertexShader = /* glsl */ `
  precision highp float;
  ${DISK}

  attribute vec4 aOrbit; // radius, angle, height above the disc, arm response
  attribute vec4 aLook;  // rgb, size in CSS pixels
  attribute vec2 aGlow;  // brightness, twinkle seed

  uniform vec2 uCenter;
  uniform vec2 uRadius;  // one galaxy radius in clip units, per axis
  uniform float uTime;   // this galaxy's own clock, which runs faster when it is raised
  uniform float uClock;  // wall clock, for the twinkle
  uniform float uFlow;   // 1: orbits freely; 0: rides with the arms
  uniform float uGain;
  uniform float uPointScale;

  varying vec3 vColor;
  varying float vStrength;

  /* A flat rotation curve with a solid-body core: the inner disc laps the outer. */
  const float SPEED = 0.05;
  const float CORE = 0.1;

  void main() {
    float r = aOrbit.x;
    float orbit = uTime * SPEED / sqrt(r * r + CORE * CORE);
    float ang = aOrbit.y + mix(uPattern, orbit, uFlow);

    gl_Position = vec4(uCenter + project(vec3(cos(ang) * r, sin(ang) * r, aOrbit.z)) * uRadius, 0.0, 1.0);

    float across = armDistance(ang, r) / ((0.03 + 0.03 * r) * uArmWidth);
    float onArm = exp(-0.5 * across * across) * smoothstep(0.06, 0.22, r) * armStrength(ang, r);
    float arm = mix(1.0, 0.55 + 1.4 * onArm, aOrbit.w * uFlow);

    float twinkle = 0.8 + 0.2 * sin(uClock * (0.9 + aGlow.y * 2.2) + aGlow.y * 61.0);

    vColor = aLook.rgb;
    vStrength = aGlow.x * arm * twinkle * uGain;
    gl_PointSize = aLook.w * uPointScale;
  }
`;

/* Added onto the frame. Alpha tracks the brightest channel so the result stays premultiplied. */
export const starFragmentShader = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vStrength;

  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float d = dot(c, c);
    float f = max(exp(-3.6 * d) - 0.027, 0.0) * vStrength;
    vec3 col = vColor * f;
    gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
  }
`;

/* Multiplied into the frame: dust filters the light behind it towards brown rather than to black. */
export const dustFragmentShader = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vStrength;

  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float f = max(1.0 - dot(c, c), 0.0);
    gl_FragColor = vec4(mix(vec3(1.0), vColor, f * f * min(vStrength, 1.0)), 1.0);
  }
`;

/* ---------- haze: the unresolved light of the bulge and disc ---------- */

export const hazeVertexShader = /* glsl */ `
  precision highp float;
  attribute vec2 aCorner;
  uniform vec2 uCenter;
  uniform vec2 uRadius;
  uniform float uExtent;
  varying vec2 vSky;

  void main() {
    vSky = aCorner * uExtent;
    gl_Position = vec4(uCenter + vSky * uRadius, 0.0, 1.0);
  }
`;

export const hazeFragmentShader = /* glsl */ `
  precision highp float;
  ${DISK}

  uniform vec3 uCore;
  uniform vec3 uDiskTint;
  uniform vec3 uDust;
  uniform vec3 uCompanion; // x, y in galaxy radii, size; size 0 for none
  uniform float uGain;
  uniform float uBar;        // the bar's half-length in galaxy radii; 0 for none
  uniform float uClump;      // 0–1: how far the arms break into knots and the lanes into filaments
  uniform float uDustAmount;

  varying vec2 vSky;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    return 0.6 * noise(p) + 0.4 * noise(p * 2.3 + 11.0);
  }

  void main() {
    // Undo the position angle, then the tilt, to find this pixel on the disc.
    vec2 q = vec2(vSky.x * uSky.x + vSky.y * uSky.y, -vSky.x * uSky.y + vSky.y * uSky.x);
    vec2 d = vec2(q.x, q.y / max(uIncl.x, 0.08)) * vec2(1.0, uMirror);
    float r = length(d);
    float ang = atan(d.y, d.x);
    // The same point in the frame that turns with the arms, so knots and the bar travel with them.
    vec2 dp = vec2(d.x * cos(uPattern) + d.y * sin(uPattern), -d.x * sin(uPattern) + d.y * cos(uPattern));

    // The bulge is a squashed ball, not a disc, so it foreshortens far less.
    float rb = length(vec2(q.x, q.y / 0.74));
    float bulge = 1.5 * exp(-rb * rb / 0.0018) + 1.0 * exp(-rb / 0.055) + 0.4 * exp(-rb / 0.15);
    if (uBar > 0.0) {
      vec2 b = dp / vec2(uBar, uBar * 0.3);
      bulge += 0.95 * exp(-1.7 * dot(b, b));
    }

    float fade = smoothstep(1.12, 0.55, r);
    float disk = exp(-r / 0.34) * fade;
    float across = armDistance(ang, r) / ((0.04 + 0.035 * r) * uArmWidth);
    float arms = exp(-0.5 * across * across) * smoothstep(0.1, 0.3, r) * fade * armStrength(ang, r);
    arms *= mix(1.0, 0.3 + 1.4 * fbm(dp * 9.0), uClump);

    // Lanes run along the upstream edge of each arm, and read darkest where they cross the bulge.
    float lanePos = (armDistance(ang, r) + 0.03 * uArmWidth) / 0.017;
    float lane = exp(-0.5 * lanePos * lanePos) * smoothstep(0.09, 0.22, r) * smoothstep(0.95, 0.55, r);
    lane *= armStrength(ang, r) * mix(1.0, smoothstep(0.32, 0.78, fbm(dp * 16.0 + 5.0)), uClump);
    float nearSide = 0.45 + 0.55 * smoothstep(0.05, -0.12, q.y * uMirror);
    vec3 filterLight = mix(vec3(1.0), uDust, lane * nearSide * 0.6 * uDustAmount);

    vec3 diskColor = mix(uDiskTint, uCore, exp(-r / 0.22));
    vec3 col = uCore * bulge + diskColor * (0.62 * disk + 0.55 * arms * exp(-r / 0.7));
    col *= filterLight;
    // A wide, faint bloom, the way a long exposure spreads the brightest light.
    col += mix(uDiskTint, uCore, 0.5) * 0.07 * exp(-length(vSky) / 0.42);

    if (uCompanion.z > 0.0) {
      vec2 c = (vSky - uCompanion.xy) / uCompanion.z;
      c.x *= 0.72;
      float dc = dot(c, c);
      col += uCore * (0.7 * exp(-dc * 3.0) + 0.9 * exp(-dc * 40.0)) * 0.5;
    }

    col *= uGain;
    // A hair of noise so the long, dim gradients do not band into rings.
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col = max(col + grain / 255.0, 0.0);
    gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
  }
`;
