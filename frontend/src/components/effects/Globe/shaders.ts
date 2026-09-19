/**
 * Earth: NASA Blue Marble day map with a drifting cloud layer, sunlit from the upper left,
 * ocean glint, and a thin blue atmosphere. Drawn on a transparent canvas (premultiplied alpha).
 */
export const globeFragmentShader = /* glsl */ `
  precision highp float;
  uniform vec2  uRes;
  uniform float uTime;
  uniform float uTexMix;   // 0 until textures load, then fades to 1
  uniform vec2  uMouse;    // -0.5..0.5, eased
  uniform sampler2D uDay;
  uniform sampler2D uClouds;

  const float PI = 3.14159265;
  const float RADIUS = 0.4;       // of the canvas' shorter side
  const float AXIAL_TILT = 0.41;  // 23.4°

  vec3 toBody(vec3 v, float spin) {
    v = vec3(v.x * cos(AXIAL_TILT) - v.y * sin(AXIAL_TILT), v.x * sin(AXIAL_TILT) + v.y * cos(AXIAL_TILT), v.z);
    return vec3(v.x * cos(spin) + v.z * sin(spin), v.y, -v.x * sin(spin) + v.z * cos(spin));
  }

  vec2 sphereUV(vec3 d, float lonShift) {
    float lon = atan(d.x, d.z) + lonShift;
    float lat = asin(clamp(d.y, -1.0, 1.0));
    return vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
  }

  void main() {
    float side = min(uRes.x, uRes.y);
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / side;
    p -= uMouse * vec2(0.02, -0.02);
    vec2 q = p / RADIUS;
    float dist = length(q);
    float px = 1.0 / (side * RADIUS);

    vec3 L = normalize(vec3(-0.6, 0.38, 0.7));
    vec3 col = vec3(0.0);
    float alpha = 0.0;

    if (dist < 1.0) {
      float z = sqrt(1.0 - dist * dist);
      vec3 n = vec3(q, z);
      float spin = uTime * 0.03;
      vec3 b = toBody(n, spin);
      float diff = dot(n, L);
      float lit = max(diff, 0.0);

      // Fallback while textures load: a simple ocean-blue sphere
      vec3 day = vec3(0.05, 0.16, 0.36);
      float cloud = 0.0;
      if (uTexMix > 0.0) {
        day = mix(day, texture2D(uDay, sphereUV(b, 0.0)).rgb, uTexMix);
        cloud = texture2D(uClouds, sphereUV(b, uTime * 0.004)).r * uTexMix;
      }

      float ocean = smoothstep(0.02, 0.1, day.b - max(day.r, day.g));
      vec3 surface = day * 1.35 * lit;

      // Sun glint on water
      vec3 h = normalize(L + vec3(0.0, 0.0, 1.0));
      surface += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, h), 0.0), 70.0) * ocean * (1.0 - cloud) * 0.7;

      // Clouds, with a soft shadow on the ground beneath
      surface *= 1.0 - cloud * 0.25;
      surface = mix(surface, vec3(1.0) * (0.04 + 1.05 * lit), smoothstep(0.1, 0.9, cloud) * 0.95);

      // Faint night side so the terminator reads as a soft blue fade
      surface += vec3(0.01, 0.02, 0.05) * (1.0 - smoothstep(-0.2, 0.2, diff));

      // Atmosphere thickening toward the limb
      float rim = pow(1.0 - z, 2.4);
      surface += vec3(0.3, 0.55, 1.0) * rim * (0.15 + 1.1 * lit);

      col = surface;
      alpha = smoothstep(1.0, 1.0 - 1.5 * px, dist);
    }

    // Glow just outside the limb, brightest on the sunlit side
    float outside = max(dist - 1.0, 0.0);
    float litSide = smoothstep(-0.6, 0.8, dot(normalize(q), normalize(L.xy)));
    // Only outside the disc (alpha is the disc's coverage)
    // ...and fading to nothing before the canvas edge so no seam shows
    vec2 edge = abs(gl_FragCoord.xy / uRes - 0.5) * 2.0; // 0 at centre, 1 at the canvas edge
    float edgeFade = smoothstep(1.0, 0.82, max(edge.x, edge.y));
    float halo = (exp(-outside / 0.025) * 0.8 + exp(-outside / 0.12) * 0.25) * litSide * (1.0 - alpha) * edgeFade;
    col = col * alpha + vec3(0.35, 0.6, 1.0) * halo;
    alpha = alpha + halo;

    col = 1.0 - exp(-col * 1.2);
    alpha = clamp(alpha, 0.0, 1.0);
    // Premultiplied output: colour is already scaled by coverage and must not exceed it
    gl_FragColor = vec4(min(col, vec3(alpha)), alpha);
  }
`;
