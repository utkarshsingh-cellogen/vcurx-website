import {
  bindFullscreenTriangle,
  createProgram,
  FULLSCREEN_VERTEX_SHADER,
  loadTexture,
} from "@/lib/webgl";
import { fragmentShader } from "./shaders";

type RendererOptions = {
  /** Draw a single still frame instead of animating. */
  still: boolean;
  /** Called once the first frame is on screen. */
  onReady: () => void;
  /** Current 0–1 scroll progress through the hero; drives the planet approach. */
  getScrollProgress: () => number;
};

/** Stars need sharp pixels, but cap the pixel ratio so high-DPI phones stay smooth. */
const MAX_PIXEL_RATIO = 1.5;
/** Start partway into the animation so the first frame is already interesting. */
const TIME_OFFSET = 20;
const MOUSE_EASE = 0.04;
/** Smooths scroll so the planet glides instead of jumping with each wheel tick. */
const SCROLL_EASE = 0.08;
/** Any elapsed time past the shader's intro length (planet rise). */
const INTRO_DONE = 100;
/** Crossfade from the procedural surface to the real textures once they load. */
const TEXTURE_FADE_MS = 1200;

/**
 * Mars surface data, both equirectangular and centred on 0° longitude:
 * - colour: NASA/USGS Viking MDIM 2.1 colour mosaic (public domain)
 * - height: NASA MGS MOLA elevation model, via USGS Astrogeology (public domain)
 */
const PLANET_TEXTURES = {
  color: "/textures/mars-color.webp",
  height: "/textures/mars-height.png",
  minSize: 4096,
};

/**
 * Starts the WebGL deep-space animation on `canvas`.
 * Returns a cleanup function, or `null` if WebGL is unavailable
 * (the caller's CSS fallback then stays visible).
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
  const uElapsed = gl.getUniformLocation(program, "uElapsed");
  const uTexMix = gl.getUniformLocation(program, "uTexMix");
  const uScroll = gl.getUniformLocation(program, "uScroll");
  gl.uniform1i(gl.getUniformLocation(program, "uColorMap"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "uHeightMap"), 1);

  // --- Real Mars textures (procedural surface is shown until both have loaded) ---
  let destroyed = false;
  let texturesReadyAt: number | null = null;
  const colorTex = gl.createTexture();
  const heightTex = gl.createTexture();

  const isAlive = () => !destroyed;

  if (gl.getParameter(gl.MAX_TEXTURE_SIZE) >= PLANET_TEXTURES.minSize) {
    Promise.all([
      loadTexture(gl, 0, colorTex, PLANET_TEXTURES.color, gl.RGB, isAlive),
      loadTexture(gl, 1, heightTex, PLANET_TEXTURES.height, gl.LUMINANCE, isAlive),
    ])
      .then(() => {
        if (destroyed) return;
        texturesReadyAt = performance.now();
        if (still) requestAnimationFrame(draw);
      })
      .catch(() => {
        /* keep the procedural surface */
      });
  }

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
  };

  const mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
  let scroll = getScrollProgress();
  const onPointerMove = (e: PointerEvent) => {
    mouse.targetX = e.clientX / window.innerWidth;
    mouse.targetY = 1 - e.clientY / window.innerHeight;
  };

  // Pause while the canvas is off-screen
  let visible = true;
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });

  let frame = 0;
  let ready = false;
  const start = performance.now();

  const draw = (now: number) => {
    mouse.x += (mouse.targetX - mouse.x) * MOUSE_EASE;
    mouse.y += (mouse.targetY - mouse.y) * MOUSE_EASE;
    const elapsed = (now - start) / 1000;
    gl.uniform1f(uTime, still ? TIME_OFFSET : elapsed + TIME_OFFSET);
    // In still mode skip the intro and show everything in place
    gl.uniform1f(uElapsed, still ? INTRO_DONE : elapsed);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    const texMix =
      texturesReadyAt === null ? 0 : still ? 1 : Math.min((now - texturesReadyAt) / TEXTURE_FADE_MS, 1);
    gl.uniform1f(uTexMix, texMix);
    const targetScroll = getScrollProgress();
    scroll = still ? targetScroll : scroll + (targetScroll - scroll) * SCROLL_EASE;
    gl.uniform1f(uScroll, scroll);
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

  resize();
  window.addEventListener("resize", resize);
  // Still mode has no animation loop, so redraw when the user scrolls
  const onStillScroll = () => requestAnimationFrame(draw);
  if (still) window.addEventListener("scroll", onStillScroll, { passive: true });

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
    window.removeEventListener("scroll", onStillScroll);
    window.removeEventListener("pointermove", onPointerMove);
    observer.disconnect();
    gl.deleteTexture(colorTex);
    gl.deleteTexture(heightTex);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
}
