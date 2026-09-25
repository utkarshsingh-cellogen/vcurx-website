import {
  bindFullscreenTriangle,
  createProgram,
  FULLSCREEN_VERTEX_SHADER,
  loadTexture,
} from "@/lib/webgl";
import { earthCamera } from "./camera";
import { fragmentShader } from "./shaders";

type RendererOptions = {
  still: boolean;
  onReady: () => void;
  getScrollProgress: () => number;
};

const MAX_PIXEL_RATIO = 1.5;
const TEXTURE_FADE_MS = 1200;
/** How quickly the sky turns to a new one, in ms (a time constant, not a duration). */
const SKY_EASE_MS = 450;

type SkyLook = { low: number[]; high: number[]; stars: number; day: number };

/**
 * The sky behind the planet for each value of `data-sky` on <html> (lib/theme.ts):
 * its colour at the horizon and overhead, how much of the starfield shows, and how far
 * it is day. Night is the black of space, exactly as before.
 */
const SKIES: Record<string, SkyLook> = {
  night: { low: [0, 0, 0], high: [0, 0, 0], stars: 1, day: 0 },
  dawn: { low: [0.36, 0.2, 0.3], high: [0.035, 0.05, 0.13], stars: 0.5, day: 0.15 },
  // Ivory, the page's own paper (#f7f5f0), a touch warmer toward the horizon.
  day: { low: [0.975, 0.95, 0.915], high: [0.969, 0.961, 0.941], stars: 0, day: 1 },
  dusk: { low: [0.42, 0.17, 0.12], high: [0.05, 0.03, 0.1], stars: 0.55, day: 0.1 },
};

const skyOf = (root: HTMLElement): SkyLook => SKIES[root.getAttribute("data-sky") ?? "night"] ?? SKIES.night;

/**
 * A scroll-driven camera pulls the opening Earth back into a whole globe behind the
 * destination. The globe is only ever seen whole, so the base imagery is all it needs:
 * the regional detail the Delhi zoom used is no longer fetched, which saved up to 4 MB
 * and a mipmap build of 16.7M pixels on the main thread early in the page's life.
 */
export function createCosmosRenderer(
  canvas: HTMLCanvasElement,
  { still, onReady, getScrollProgress }: RendererOptions,
): (() => void) | null {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return null;
  const program = createProgram(gl, FULLSCREEN_VERTEX_SHADER, fragmentShader);
  if (!program) return null;
  gl.useProgram(program);
  const buffer = bindFullscreenTriangle(gl, program);

  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uMouse = gl.getUniformLocation(program, "uMouse");
  const uTexMix = gl.getUniformLocation(program, "uTexMix");
  const uRadius = gl.getUniformLocation(program, "uRadius");
  const uCenterY = gl.getUniformLocation(program, "uCenterY");
  const uOrientation = gl.getUniformLocation(program, "uOrientation");
  const uApproach = gl.getUniformLocation(program, "uApproach");
  const uGhost = gl.getUniformLocation(program, "uGhost");
  const uSkyLow = gl.getUniformLocation(program, "uSkyLow");
  const uSkyHigh = gl.getUniformLocation(program, "uSkyHigh");
  const uStars = gl.getUniformLocation(program, "uStars");
  const uDay = gl.getUniformLocation(program, "uDay");
  gl.uniform1i(gl.getUniformLocation(program, "uColorMap"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "uCloudMap"), 1);

  const colorTex = gl.createTexture();
  const cloudTex = gl.createTexture();
  // Complete placeholder textures keep the initial frame valid before images load.
  [colorTex, cloudTex].forEach((texture, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  });

  let destroyed = false;
  let texturesReadyAt: number | null = null;
  let frame = 0;
  let ready = false;
  let visible = true;
  let scroll = getScrollProgress();
  let rotationElapsed = 0;
  let previousTime = performance.now();
  const start = previousTime;
  const mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
  // The page opens on its sky; a later change of sky eases across.
  const root = document.documentElement;
  let skyTarget = skyOf(root);
  const sky: SkyLook = { low: [...skyTarget.low], high: [...skyTarget.high], stars: skyTarget.stars, day: skyTarget.day };

  const draw = (now: number) => {
    if (destroyed) return;
    const delta = Math.min(now - previousTime, 100);
    previousTime = now;
    const ease = 1 - Math.exp(-delta / 140);
    mouse.x += (mouse.targetX - mouse.x) * ease;
    mouse.y += (mouse.targetY - mouse.y) * ease;
    const elapsed = (now - start) / 1000;
    // Start the opening turn when Earth's surface is available, and count only
    // visible frames so a slow texture download or background tab cannot skip it.
    if (texturesReadyAt !== null) rotationElapsed += delta / 1000;
    scroll = still ? getScrollProgress() : scroll + (getScrollProgress() - scroll) * ease;
    // The globe stays on screen behind the destination, dimmed, so it is drawn for as
    // long as the stage is; the IntersectionObserver below parks the loop once it scrolls away.
    const camera = earthCamera(canvas.width / canvas.height, scroll, elapsed, still, rotationElapsed);
    const textureMix = texturesReadyAt === null ? 0 : still ? 1 : Math.min((now - texturesReadyAt) / TEXTURE_FADE_MS, 1);
    gl.uniform1f(uTime, still ? 20 : elapsed + 20);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uTexMix, textureMix);
    gl.uniform1f(uRadius, camera.radius);
    gl.uniform1f(uCenterY, camera.centerY);
    gl.uniform2f(uOrientation, camera.longitude, camera.latitude);
    gl.uniform1f(uApproach, camera.approach);
    gl.uniform1f(uGhost, camera.ghost);
    const skyEase = still ? 1 : 1 - Math.exp(-delta / SKY_EASE_MS);
    for (let i = 0; i < 3; i++) {
      sky.low[i] += (skyTarget.low[i] - sky.low[i]) * skyEase;
      sky.high[i] += (skyTarget.high[i] - sky.high[i]) * skyEase;
    }
    sky.stars += (skyTarget.stars - sky.stars) * skyEase;
    sky.day += (skyTarget.day - sky.day) * skyEase;
    gl.uniform3f(uSkyLow, sky.low[0], sky.low[1], sky.low[2]);
    gl.uniform3f(uSkyHigh, sky.high[0], sky.high[1], sky.high[2]);
    gl.uniform1f(uStars, sky.stars);
    gl.uniform1f(uDay, sky.day);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!ready) {
      ready = true;
      onReady();
    }
  };

  const loop = (now: number) => {
    frame = 0;
    if (destroyed || !visible || document.hidden) return;
    draw(now);
    frame = requestAnimationFrame(loop);
  };
  /** Restarts the loop after it has parked offscreen or in a hidden tab. */
  const resume = () => {
    if (destroyed || still || frame || !visible || document.hidden) return;
    previousTime = performance.now();
    frame = requestAnimationFrame(loop);
  };
  const onVisibilityChange = () => resume();
  const scheduleStill = () => {
    if (destroyed || !still || frame) return;
    frame = requestAnimationFrame(() => {
      // ScrollStage publishes its progress in an animation frame as well.
      // Draw on the following frame so a single scroll event uses the latest value.
      frame = requestAnimationFrame((now) => {
        frame = 0;
        draw(now);
      });
    });
  };
  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    scheduleStill();
  };
  const onPointerMove = (e: PointerEvent) => {
    mouse.targetX = e.clientX / window.innerWidth;
    mouse.targetY = 1 - e.clientY / window.innerHeight;
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    resume();
  });
  // The theme toggle, or Auto crossing an hour, changes the sky; the next frames ease to it.
  const skyObserver = new MutationObserver(() => {
    skyTarget = skyOf(root);
    scheduleStill();
  });
  skyObserver.observe(root, { attributes: true, attributeFilter: ["data-sky"] });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  window.addEventListener("resize", resize);
  if (still) {
    window.addEventListener("scroll", scheduleStill, { passive: true });
    scheduleStill();
  } else {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    observer.observe(canvas);
    frame = requestAnimationFrame(loop);
  }

  Promise.all([
    loadTexture(gl, 0, colorTex, "/textures/earth-color.webp", gl.RGB, () => !destroyed),
    loadTexture(gl, 1, cloudTex, "/textures/earth-clouds.webp", gl.RGB, () => !destroyed),
  ]).then(() => {
    if (destroyed) return;
    texturesReadyAt = performance.now();
    scheduleStill();
  }).catch(() => {
    // Keep the blue sphere if the imagery fails.
  });

  return () => {
    destroyed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", scheduleStill);
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    observer.disconnect();
    skyObserver.disconnect();
    resizeObserver.disconnect();
    gl.deleteTexture(colorTex);
    gl.deleteTexture(cloudTex);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
}
