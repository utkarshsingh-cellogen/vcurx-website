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
/**
 * The most pixels the shader draws per frame, whatever the screen: 1.6M is a 1440x900
 * window at 1.25x. Every pixel runs five star layers and the planet, so a large window
 * at full density was most of an integrated GPU's frame.
 */
const PIXEL_BUDGET = 1_600_000;
/**
 * Adaptive quality: every ADAPT_FRAMES frames the average frame time is checked, and
 * the drawing resolution is lowered by a step when frames run slow, and raised again
 * when there is room. The globe is soft and the stars are small points, so a lower
 * resolution barely shows, where a stutter does.
 */
const ADAPT_FRAMES = 45;
const SLOW_MS = 22;
const FAST_MS = 17.5;
const QUALITY_STEP = 0.82;
const MIN_QUALITY = 0.5;
const TEXTURE_FADE_MS = 1200;

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
  // Adaptive quality (see ADAPT_FRAMES): a multiplier on the drawing resolution, and the
  // frame times gathered since it was last checked.
  let quality = 1;
  let adaptFrames = 0;
  let adaptTotal = 0;
  let roomChecks = 0;

  const adapt = (delta: number, now: number) => {
    // Loading stalls the first frames, so only judge once the surface has settled in.
    if (still || texturesReadyAt === null || now - texturesReadyAt < 1500) return;
    adaptTotal += delta;
    if (++adaptFrames < ADAPT_FRAMES) return;
    const average = adaptTotal / adaptFrames;
    adaptFrames = 0;
    adaptTotal = 0;
    if (average > SLOW_MS && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality * QUALITY_STEP);
      roomChecks = 0;
      resize();
    } else if (average < FAST_MS && quality < 1) {
      // Raise only after two roomy checks running, so it does not see-saw.
      if (++roomChecks >= 2) {
        quality = Math.min(1, quality / QUALITY_STEP);
        roomChecks = 0;
        resize();
      }
    } else {
      roomChecks = 0;
    }
  };

  const draw = (now: number) => {
    if (destroyed) return;
    const delta = Math.min(now - previousTime, 100);
    previousTime = now;
    adapt(delta, now);
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
  // Declared after `adapt`, which calls it: only ever from a frame, once this exists.
  const resize = () => {
    const cssPixels = Math.max(1, canvas.clientWidth * canvas.clientHeight);
    const scale = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO, Math.sqrt(PIXEL_BUDGET / cssPixels)) * quality;
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
    resizeObserver.disconnect();
    gl.deleteTexture(colorTex);
    gl.deleteTexture(cloudTex);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
}
