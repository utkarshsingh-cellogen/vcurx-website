import {
  bindFullscreenTriangle,
  createProgram,
  FULLSCREEN_VERTEX_SHADER,
  loadTexture,
} from "@/lib/webgl";
import { globeFragmentShader } from "./shaders";

/** NASA Visible Earth "Blue Marble" imagery (public domain). */
const EARTH_TEXTURES = {
  day: "/textures/earth-color.webp",
  clouds: "/textures/earth-clouds.webp",
};

const MAX_PIXEL_RATIO = 1.5;
const TEXTURE_FADE_MS = 900;
const MOUSE_EASE = 0.05;

type GlobeOptions = {
  still: boolean;
  onReady: () => void;
};

/** Starts the Earth globe on a transparent canvas. Returns cleanup, or null without WebGL. */
export function createGlobeRenderer(canvas: HTMLCanvasElement, { still, onReady }: GlobeOptions) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return null;

  const program = createProgram(gl, FULLSCREEN_VERTEX_SHADER, globeFragmentShader);
  if (!program) return null;
  gl.useProgram(program);
  const buffer = bindFullscreenTriangle(gl, program);

  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uTexMix = gl.getUniformLocation(program, "uTexMix");
  const uMouse = gl.getUniformLocation(program, "uMouse");
  gl.uniform1i(gl.getUniformLocation(program, "uDay"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "uClouds"), 1);

  let destroyed = false;
  let readyAt: number | null = null;
  const dayTex = gl.createTexture();
  const cloudTex = gl.createTexture();
  const isAlive = () => !destroyed;

  Promise.all([
    loadTexture(gl, 0, dayTex, EARTH_TEXTURES.day, gl.RGB, isAlive),
    loadTexture(gl, 1, cloudTex, EARTH_TEXTURES.clouds, gl.RGB, isAlive),
  ])
    .then(() => {
      if (destroyed) return;
      readyAt = performance.now();
      if (still) requestAnimationFrame(draw);
    })
    .catch(() => {
      /* keep the plain blue sphere */
    });

  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const w = Math.max(1, Math.floor(canvas.clientWidth * scale));
    const h = Math.max(1, Math.floor(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
    if (still) requestAnimationFrame(draw);
  };

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointerMove = (e: PointerEvent) => {
    mouse.tx = e.clientX / window.innerWidth - 0.5;
    mouse.ty = e.clientY / window.innerHeight - 0.5;
  };

  let visible = false;
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });

  let frame = 0;
  let ready = false;
  const start = performance.now();

  const draw = (now: number) => {
    mouse.x += (mouse.tx - mouse.x) * MOUSE_EASE;
    mouse.y += (mouse.ty - mouse.y) * MOUSE_EASE;
    gl.uniform1f(uTime, still ? 40 : (now - start) / 1000 + 40);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uTexMix, readyAt === null ? 0 : still ? 1 : Math.min((now - readyAt) / TEXTURE_FADE_MS, 1));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!ready) {
      ready = true;
      onReady();
    }
  };

  // Only spend GPU time while the globe is on screen
  const loop = (now: number) => {
    if (visible && !document.hidden) draw(now);
    frame = requestAnimationFrame(loop);
  };

  resize();
  window.addEventListener("resize", resize);
  if (still) {
    frame = requestAnimationFrame(draw);
  } else {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    observer.observe(canvas);
    frame = requestAnimationFrame(loop);
  }

  return () => {
    destroyed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointerMove);
    observer.disconnect();
    gl.deleteTexture(dayTex);
    gl.deleteTexture(cloudTex);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
}
