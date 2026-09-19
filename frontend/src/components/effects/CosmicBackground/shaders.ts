
/**
 * Black-space scene: a large, slowly turning Mars-like planet rising from the bottom
 * of the screen with a glowing atmospheric rim, plus drifting, twinkling and sparkling stars.
 */
export const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec2  uRes;
  uniform float uTime;     // animation clock
  uniform float uElapsed;  // real seconds since start (drives the intro)
  uniform vec2  uMouse;
  uniform sampler2D uColorMap;  // Viking colour mosaic, equirectangular
  uniform sampler2D uHeightMap; // MOLA elevation, equirectangular
  uniform float uTexMix;        // 0 = procedural surface, 1 = real Mars textures
  uniform float uScroll;        // 0–1 scroll progress through the hero

  const float PI = 3.14159265;

  // Planet orientation: axial roll in screen plane, tilt toward the viewer, then spin
  const float ROLL = 0.38;
  const float TILT = 0.22;

  // --- 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT) ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * snoise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return v * 0.5 + 0.5;
  }

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
    float core = smoothstep(size, 0.0, d);
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

  float segmentDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * k);
  }

  // Mars-like surface colour for a point on the unit sphere
  vec3 surface(vec3 n) {
    float h  = fbm(n * 2.2);
    float h2 = fbm(n * 7.5 + 11.0);

    vec3 rust  = vec3(0.62, 0.25, 0.10);
    vec3 sand  = vec3(0.94, 0.55, 0.30);
    vec3 dust  = vec3(1.00, 0.72, 0.48);
    vec3 basalt = vec3(0.24, 0.10, 0.05);

    vec3 col = mix(rust, sand, smoothstep(0.35, 0.72, h));
    col = mix(col, dust, smoothstep(0.58, 0.85, h2) * 0.25);
    col *= 0.86 + 0.3 * h2;

    // Fine dusty grain
    col *= 0.9 + 0.2 * fbm(n * 16.0 + 5.0);

    // Dark volcanic plains
    col = mix(col, basalt, smoothstep(0.6, 0.8, fbm(n * 1.4 + 4.0)) * 0.6);

    // A long canyon system following a warped great circle across the visible face
    vec3 axis = normalize(vec3(-0.24, 0.79, -0.57));
    float band = abs(dot(n, axis) + 0.1 * (fbm(n * 3.5) - 0.5));
    // Break the rift into irregular segments of varying width
    float width = 0.012 + 0.03 * fbm(n * 5.0 + 3.0);
    float canyon = smoothstep(width, 0.0, band) * smoothstep(0.48, 0.62, fbm(n * 1.3 + 2.0));
    col = mix(col, basalt * 0.7, canyon * 0.85);
    // Bright canyon rims
    col += vec3(0.22, 0.1, 0.04) * smoothstep(width * 1.8, width, band) * step(width, band)
         * smoothstep(0.48, 0.62, fbm(n * 1.3 + 2.0));
    return col;
  }

  // View space → planet body space (y = rotation axis, north up)
  vec3 toPlanet(vec3 v, float spin) {
    v = vec3(v.x * cos(ROLL) - v.y * sin(ROLL), v.x * sin(ROLL) + v.y * cos(ROLL), v.z);
    v = vec3(v.x, v.y * cos(TILT) + v.z * sin(TILT), -v.y * sin(TILT) + v.z * cos(TILT));
    return vec3(v.x * cos(spin) + v.z * sin(spin), v.y, -v.x * sin(spin) + v.z * cos(spin));
  }

  vec2 sphereUV(vec3 d) {
    float lon = atan(d.x, d.z);
    float lat = asin(clamp(d.y, -1.0, 1.0));
    return vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
  }

  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  // Real-data surface: colour-graded albedo plus a bump-mapped normal
  vec3 texturedSurface(vec3 tn, out vec3 bumpN) {
    vec2 uv = sphereUV(tn);
    float lat = asin(clamp(tn.y, -1.0, 1.0));
    float lon = atan(tn.x, tn.z);

    vec3 albedo = texture2D(uColorMap, uv).rgb;
    // Grade the muted Viking mosaic toward the warm, sunlit orange of the reference
    float l = luma(albedo);
    albedo = mix(vec3(l), albedo, 1.45);
    albedo = pow(max(albedo, 0.0), vec3(0.95, 1.05, 1.25)) * vec3(1.35, 0.95, 0.72);

    // Slopes: MOLA for big relief (volcanoes, basins, canyons) + albedo detail for craters
    float cosLat = max(cos(lat), 0.08);
    vec2 eL = vec2(1.5 / 1024.0, 1.5 / 512.0);
    vec2 eD = vec2(1.0 / 4096.0, 1.0 / 2048.0);
    float gxL = texture2D(uHeightMap, uv + vec2(eL.x, 0.0)).r - texture2D(uHeightMap, uv - vec2(eL.x, 0.0)).r;
    float gyL = texture2D(uHeightMap, uv + vec2(0.0, eL.y)).r - texture2D(uHeightMap, uv - vec2(0.0, eL.y)).r;
    float gxD = luma(texture2D(uColorMap, uv + vec2(eD.x, 0.0)).rgb) - luma(texture2D(uColorMap, uv - vec2(eD.x, 0.0)).rgb);
    float gyD = luma(texture2D(uColorMap, uv + vec2(0.0, eD.y)).rgb) - luma(texture2D(uColorMap, uv - vec2(0.0, eD.y)).rgb);

    float gEast  = (gxL * 7.0 + gxD * 2.2) / cosLat;
    float gNorth = -(gyL * 7.0 + gyD * 2.2); // v grows southward

    vec3 east  = vec3(cos(lon), 0.0, -sin(lon));
    vec3 north = vec3(-sin(lon) * sin(lat), cos(lat), -cos(lon) * sin(lat));
    bumpN = normalize(tn - (east * gEast + north * gNorth));
    return albedo;
  }

  // North polar ice cap with its characteristic spiral troughs
  vec3 applyPolarCap(vec3 surf, vec3 tn) {
    float polar = acos(clamp(tn.y, -1.0, 1.0)); // angular distance from the pole
    float lon = atan(tn.x, tn.z);
    float edgeNoise = fbm(tn * 5.0) - 0.5;
    float capRadius = 0.2 + 0.07 * edgeNoise; // ~11° with a ragged edge
    float cap = smoothstep(capRadius + 0.015, capRadius - 0.015, polar);

    float swirl = sin(lon * 2.0 + log(polar + 0.02) * 7.0 + edgeNoise * 5.0);
    float trough = smoothstep(0.75, 1.0, swirl) * smoothstep(0.02, 0.08, polar);

    vec3 ice = vec3(0.97, 0.95, 0.93) * (0.9 + 0.12 * fbm(tn * 18.0));
    ice = mix(ice, ice * vec3(0.78, 0.62, 0.52), trough * 0.7);

    // Thin seasonal frost just outside the cap
    float frost = smoothstep(capRadius + 0.09, capRadius, polar) * (1.0 - cap) * fbm(tn * 9.0 + 3.0);
    surf = mix(surf, vec3(0.92, 0.86, 0.8), frost * 0.55);
    return mix(surf, ice, cap);
  }

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 mouse = uMouse - 0.5;
    float t = uTime;
    float px = 1.0 / uRes.y;

    // --- Planet placement: large and low on wide screens, smaller on portrait ---
    float R = clamp(aspect * 0.62, 0.52, 1.05);
    float topY = mix(-0.04, -0.11, clamp((aspect - 0.6) / 1.0, 0.0, 1.0));
    // Intro: the planet rises into place
    float rise = 1.0 - pow(1.0 - clamp(uElapsed / 3.4, 0.0, 1.0), 3.0);
    topY -= (1.0 - rise) * 0.45;
    // Scroll: we fly toward the planet — it grows and climbs until its limb nears the top
    float approach = uScroll * uScroll * (3.0 - 2.0 * uScroll);
    R *= mix(1.0, 2.5, approach);
    topY = mix(topY, 0.36, approach);
    vec2 center = vec2(0.0, topY - R) + mouse * vec2(0.012, 0.008);

    vec2 q = (p - center) / R;
    float dist = length(q);

    vec3 col = vec3(0.0);

    // --- Stars (hidden behind the planet) ---
    vec2 drift = vec2(-1.0, 0.3) * t;
    // As we descend, nearer stars slide up out of frame faster than distant ones
    vec2 fly = vec2(0.0, -approach);
    vec3 stars = vec3(0.0);
    stars += starLayer(p + drift * 0.0020 + mouse * 0.004 + fly * 0.10, 110.0, 0.14, 0.5, 1.0,  t);
    stars += starLayer(p + drift * 0.0045 + mouse * 0.010 + fly * 0.20,  60.0, 0.12, 0.75, 17.0, t);
    stars += starLayer(p + drift * 0.0080 + mouse * 0.020 + fly * 0.35,  32.0, 0.10, 1.0, 41.0, t);
    stars += sparkleLayer(p + drift * 0.0060 + mouse * 0.025 + fly * 0.30, 5.0, 0.26, 30.0, 131.0, t);
    stars += sparkleLayer(p + drift * 0.0035 + mouse * 0.015 + fly * 0.18, 9.0, 0.16, 18.0, 177.0, t);

    // Occasional shooting star
    float period = 8.0;
    float k = floor(t / period);
    float lt = t - k * period;
    if (lt < 1.1) {
      vec2 start = vec2((hash21(vec2(k, 1.0)) - 0.2) * aspect * 0.8, 0.25 + 0.2 * hash21(vec2(k, 2.0)));
      vec2 dir = normalize(vec2(-1.0, -0.3 - 0.25 * hash21(vec2(k, 3.0))));
      vec2 head = start + dir * lt * 0.75;
      vec2 tail = head - dir * 0.2;
      float along = clamp(dot(p - tail, dir) / 0.2, 0.0, 1.0);
      stars += vec3(0.85, 0.92, 1.0) * smoothstep(2.0 * px, 0.0, segmentDist(p, tail, head))
             * along * sin(PI * lt / 1.1) * 1.4;
    }

    // Light comes from above and slightly behind, like the reference
    vec3 L = normalize(vec3(-0.15, 0.95, 0.18));
    // How lit the rim is at this angle (brightest at the top)
    float rimLight = smoothstep(-0.35, 0.9, q.y / max(dist, 1e-4));

    // --- Planet body ---
    float edgeAA = smoothstep(1.0, 1.0 - 1.5 * px / R, dist);
    if (dist < 1.0) {
      float z = sqrt(max(1.0 - dist * dist, 0.0));
      vec3 n = vec3(q, z);

      // Slow spin around the planet's own axis
      float spin = t * 0.01 + 2.2;
      vec3 tn = toPlanet(n, spin);
      vec3 Lp = toPlanet(L, spin);
      float smoothDiff = max(dot(n, L), 0.0);

      // Procedural surface is the fallback while the real textures load
      vec3 surf = vec3(0.0);
      float diff = smoothDiff;
      if (uTexMix < 1.0) {
        surf = surface(tn);
      }
      if (uTexMix > 0.0) {
        vec3 bumpN;
        vec3 texSurf = texturedSurface(tn, bumpN);
        // Bump shading, kept inside the day side so the terminator stays soft
        float texDiff = max(dot(bumpN, Lp), 0.0) * smoothstep(-0.05, 0.2, dot(tn, Lp));
        surf = mix(surf, texSurf, uTexMix);
        diff = mix(smoothDiff, texDiff, uTexMix);
      }
      surf = applyPolarCap(surf, tn);

      vec3 body = surf * (0.03 + 1.15 * pow(diff, 1.1));

      // Atmospheric haze thickening toward the limb
      float limb = pow(1.0 - z, 3.0);
      body = mix(body, vec3(0.70, 0.90, 0.84) * (0.15 + 0.9 * rimLight), limb * 0.75);

      col = mix(stars, body, edgeAA);
    } else {
      col = stars;
    }

    // --- Atmosphere glow just outside the planet ---
    float outside = max(dist - 1.0, 0.0) * R;
    float halo = exp(-outside / 0.018) * 0.9 + exp(-outside / 0.08) * 0.25;
    col += vec3(0.62, 0.88, 0.80) * halo * rimLight * (1.0 - edgeAA);
    // Bloom: light from the bright limb scattering wide into the black sky
    col += vec3(0.75, 0.85, 0.80) * exp(-outside / 0.35) * 0.07 * rimLight * (1.0 - edgeAA);

    // Darken the lower screen so the planet sinks into shadow
    col *= mix(0.12, 1.0, smoothstep(-0.55, 0.02, p.y));

    // Lens vignette
    vec2 uv = gl_FragCoord.xy / uRes;
    col *= 1.0 - 0.3 * pow(length((uv - 0.5) * vec2(1.0, 1.15)) * 1.25, 2.4);

    col = 1.0 - exp(-col * 1.25);

    // Animated film grain
    float grain = hash21(gl_FragCoord.xy + fract(t * 7.13) * vec2(113.0, 71.0)) - 0.5;
    col += grain * 0.035;

    gl_FragColor = vec4(col, 1.0);
  }
`;
