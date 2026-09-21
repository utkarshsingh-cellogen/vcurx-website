/** Earth rising in space, with a scroll-driven camera that settles over Delhi. */
export const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform sampler2D uColorMap;
  uniform sampler2D uCloudMap;
  uniform sampler2D uDetailMap;
  uniform float uDetailMix;
  uniform float uTexMix;
  uniform float uRadius;
  uniform float uCenterY;
  uniform vec2 uOrientation; // longitude, latitude in radians
  uniform float uApproach;
  const float PI = 3.14159265;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // One layer of small twinkling stars on a jittered grid
  vec3 starLayer(vec2 uv, float scale, float density, float bright, float seed, float t) {
    vec2 q = uv * scale;
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;

    float h = hash21(id + seed);
    float present = step(1.0 - density, h);
    vec2 offset = (vec2(hash21(id + seed + 1.3), hash21(id + seed + 7.1)) - 0.5) * 0.6;
    float d = length(f - offset);

    // Radius in screen pixels, converted to cell units so stars stay crisp at any resolution
    float size = (0.7 + 1.8 * pow(hash21(id + seed + 3.7), 5.0)) * scale / uRes.y;
    float core = (1.0 - smoothstep(0.0, size, d));
    float cellFade = 1.0 - smoothstep(0.2, 0.5, max(abs(f.x), abs(f.y)));
    float halo = exp(-d * d / (size * size * 4.0)) * 0.18 * cellFade;

    float twinkle = 0.55 + 0.45 * sin(t * (0.6 + 2.6 * hash21(id + seed + 5.9)) + h * 60.0);
    float warm = step(0.78, hash21(id + seed + 11.0));
    vec3 tint = mix(mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.75, 0.5), warm), vec3(1.0), 0.4);
    return tint * present * twinkle * bright * (core + halo);
  }

  // Sparse bright stars that periodically flare with four-point diffraction spikes
  vec3 sparkleLayer(vec2 uv, float scale, float density, float maxLen, float seed, float t) {
    vec2 q = uv * scale;
    vec2 id = floor(q);
    vec2 cell = fract(q) - 0.5;
    float edgeFade = 1.0 - smoothstep(0.3, 0.5, max(abs(cell.x), abs(cell.y)));

    float h = hash21(id + seed);
    float present = step(1.0 - density, h);
    vec2 d = cell - (vec2(hash21(id + seed + 2.1), hash21(id + seed + 4.3)) - 0.5) * 0.4;

    float px = scale / uRes.y;
    float len = (0.45 + 0.55 * hash21(id + seed + 6.7)) * maxLen * px;
    float w = 0.8 * px;

    vec2 a = d / len;
    float spikes = exp(-abs(d.y) / w - a.x * a.x) + exp(-abs(d.x) / w - a.y * a.y);
    vec2 r = vec2(d.x + d.y, d.x - d.y) * 0.7071;
    vec2 b = r / (len * 0.4);
    spikes += 0.3 * (exp(-abs(r.y) / w - b.x * b.x) + exp(-abs(r.x) / w - b.y * b.y));

    float core = exp(-dot(d, d) / (4.0 * px * px));
    float glow = exp(-length(d) / (7.0 * px)) * 0.3;
    float flare = pow(0.5 + 0.5 * sin(t * (0.3 + 0.5 * hash21(id + seed + 8.8)) + h * 40.0), 12.0);

    vec3 tint = mix(vec3(0.82, 0.9, 1.0), vec3(1.0, 0.9, 0.76), step(0.6, hash21(id + seed + 9.9)));
    return tint * present * (core * (0.5 + flare) + (spikes * 0.75 + glow) * flare * edgeFade + glow * 0.25);
  }

  vec3 toEarth(vec3 n) {
    float lon = uOrientation.x;
    float lat = uOrientation.y;
    vec3 east = vec3(cos(lon), 0.0, -sin(lon));
    vec3 north = vec3(-sin(lat) * sin(lon), cos(lat), -sin(lat) * cos(lon));
    vec3 forward = vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon));
    return east * n.x + north * n.y + forward * n.z;
  }

  vec2 sphereUV(vec3 n) {
    return vec2(atan(n.x, n.z) / (2.0 * PI) + 0.5,
                0.5 - asin(clamp(n.y, -1.0, 1.0)) / PI);
  }

  void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float px = 1.0 / uRes.y;
    float t = uTime;
    vec2 mouse = (uMouse - 0.5) * (1.0 - uApproach);
    vec2 q = (p - vec2(0.0, uCenterY)) / uRadius;
    float dist = length(q);

    vec2 drift = vec2(-1.0, 0.3) * t;
    vec2 fly = vec2(0.0, -uApproach);
    vec3 stars = starLayer(p + drift * 0.002 + mouse * 0.004 + fly * 0.1, 110.0, 0.14, 0.5, 1.0, t);
    stars += starLayer(p + drift * 0.0045 + mouse * 0.01 + fly * 0.2, 60.0, 0.12, 0.75, 17.0, t);
    stars += starLayer(p + drift * 0.008 + mouse * 0.02 + fly * 0.35, 32.0, 0.1, 1.0, 41.0, t);
    stars += sparkleLayer(p + drift * 0.006 + mouse * 0.025, 5.0, 0.26, 30.0, 131.0, t);
    stars += sparkleLayer(p + drift * 0.0035 + mouse * 0.015, 9.0, 0.16, 18.0, 177.0, t);

    vec3 light = normalize(vec3(-0.35, 0.55, 0.9));
    vec3 col = stars;
    float coverage = 1.0 - smoothstep(1.0 - 1.5 * px / uRadius, 1.0, dist);
    if (dist < 1.0) {
      float z = sqrt(max(1.0 - dist * dist, 0.0));
      vec3 n = vec3(q, z);
      vec2 uv = sphereUV(toEarth(n));
      float lit = max(dot(n, light), 0.0);
      vec3 day = vec3(0.025, 0.12, 0.3);
      float cloud = 0.0;
      if (uTexMix > 0.0) {
        day = mix(day, texture2D(uColorMap, uv).rgb, uTexMix);
        // Regional NASA imagery: 35°E–120°E, 10°S–75°N.
        // Geographic UVs keep the high-resolution layer registered to the globe.
        vec2 degrees = vec2((uv.x - 0.5) * 360.0, (0.5 - uv.y) * 180.0);
        vec2 detailUV = vec2((degrees.x - 35.0) / 85.0, (75.0 - degrees.y) / 85.0);
        vec2 edge = min(detailUV, 1.0 - detailUV);
        float coverage = smoothstep(0.0, 0.06, min(edge.x, edge.y));
        float detailMix = coverage * uDetailMix * smoothstep(0.1, 0.55, uApproach);
        day = mix(day, texture2D(uDetailMap, clamp(detailUV, 0.0, 1.0)).rgb, detailMix);
        cloud = texture2D(uCloudMap, uv + vec2(t * 0.0006, 0.0)).r * uTexMix;
      }
      // Keep India's geography clear as the camera arrives.
      cloud *= mix(0.8, 0.16, uApproach);
      vec3 surface = day * (0.12 + 1.3 * lit);
      surface = mix(surface, vec3(0.12 + 1.15 * lit), smoothstep(0.1, 0.9, cloud));
      float ocean = smoothstep(0.02, 0.1, day.b - max(day.r, day.g));
      vec3 halfLight = normalize(light + vec3(0.0, 0.0, 1.0));
      surface += vec3(0.7, 0.85, 1.0) * pow(max(dot(n, halfLight), 0.0), 70.0) * ocean * (1.0 - cloud) * 0.35;
      surface += vec3(0.18, 0.45, 1.0) * pow(1.0 - z, 2.6) * (0.2 + lit);
      col = mix(stars, surface, coverage);
    }
    float rimLight = smoothstep(-0.5, 0.9, dot(q / max(dist, 0.0001), normalize(light.xy)));
    float outside = max(dist - 1.0, 0.0) * uRadius;
    float halo = exp(-outside / 0.015) * 0.7 + exp(-outside / 0.065) * 0.2;
    col += vec3(0.2, 0.5, 1.0) * halo * rimLight * (1.0 - coverage);
    // The opening keeps its dramatic shadow; the India view is evenly readable.
    col *= mix(mix(0.2, 1.0, smoothstep(-0.55, 0.02, p.y)), 1.0, uApproach);
    vec2 uv = gl_FragCoord.xy / uRes;
    col *= 1.0 - 0.18 * pow(length((uv - 0.5) * vec2(1.0, 1.15)), 2.0);
    col = 1.0 - exp(-col * 1.25);
    gl_FragColor = vec4(col, 1.0);
  }
`;
