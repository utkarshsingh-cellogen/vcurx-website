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

const MAX_PIXEL_RATIO = 2;
const TEXTURE_FADE_MS = 1200;

/** A scroll-driven camera carries the opening Earth scene into the destination. */
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
  const uDetailMix = gl.getUniformLocation(program, "uDetailMix");
  const uRadius = gl.getUniformLocation(program, "uRadius");
  const uCenterY = gl.getUniformLocation(program, "uCenterY");
  const uOrientation = gl.getUniformLocation(program, "uOrientation");
  const uApproach = gl.getUniformLocation(program, "uApproach");
  gl.uniform1i(gl.getUniformLocation(program, "uColorMap"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "uCloudMap"), 1);
  gl.uniform1i(gl.getUniformLocation(program, "uDetailMap"), 2);

  const colorTex = gl.createTexture();
  const cloudTex = gl.createTexture();
  const detailTex = gl.createTexture();
  // Complete placeholder textures keep the initial frame valid before images load.
  [colorTex, cloudTex, detailTex].forEach((texture, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  });

  let destroyed = false;
  let texturesReadyAt: number | null = null;
  let detailReadyAt: number | null = null;
  let frame = 0;
  let ready = false;
  let visible = true;
  let scroll = getScrollProgress();
  let rotationElapsed = 0;
  let previousTime = performance.now();
  const start = previousTime;
  const mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };

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
    const camera = earthCamera(canvas.width / canvas.height, scroll, elapsed, still, rotationElapsed);
    const textureMix = texturesReadyAt === null ? 0 : still ? 1 : Math.min((now - texturesReadyAt) / TEXTURE_FADE_MS, 1);
    gl.uniform1f(uTime, still ? 20 : elapsed + 20);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uTexMix, textureMix);
    gl.uniform1f(uDetailMix, detailReadyAt === null ? 0 : still ? 1 : Math.min((now - detailReadyAt) / TEXTURE_FADE_MS, 1));
    gl.uniform1f(uRadius, camera.radius);
    gl.uniform1f(uCenterY, camera.centerY);
    gl.uniform2f(uOrientation, camera.longitude, camera.latitude);
    gl.uniform1f(uApproach, camera.approach);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!ready) {
      ready = true;
      onReady();
    }
  };

  const loop = (now: number) => {
    if (visible && !document.hidden) draw(now);
    frame = requestAnimationFrame(loop);
  };
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
    // The globe appears first; regional detail loads without blocking its intro.
    const detailSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 4096 ? 4096 : 2048;
    return loadTexture(gl, 2, detailTex, `/textures/earth-india-${detailSize}.webp`, gl.RGB,
      () => !destroyed, { clampLongitude: true, mipmaps: true })
      .then(() => {
        if (destroyed) return;
        detailReadyAt = performance.now();
        scheduleStill();
      });
  }).catch(() => {
    // Keep the base imagery if regional detail fails, or the blue sphere if both fail.
  });

  return () => {
    destroyed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", scheduleStill);
    window.removeEventListener("pointermove", onPointerMove);
    observer.disconnect();
    resizeObserver.disconnect();
    gl.deleteTexture(colorTex);
    gl.deleteTexture(cloudTex);
    gl.deleteTexture(detailTex);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
}
