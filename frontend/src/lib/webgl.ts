/** Small WebGL1 helpers shared by the canvas effects. */

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Compiles and links a program, or returns null (callers fall back to CSS). */
export function createProgram(gl: WebGLRenderingContext, vertexSrc: string, fragmentSrc: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // Shaders can be flagged for deletion once linked
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export const FULLSCREEN_VERTEX_SHADER = /* glsl */ `
  attribute vec2 aPos;
  void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Binds one oversized triangle covering the viewport to the program's `aPos`. */
export function bindFullscreenTriangle(gl: WebGLRenderingContext, program: WebGLProgram) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  return buffer;
}

/**
 * Loads an image into a texture on `unit`. Longitude wraps (REPEAT on S), latitude clamps.
 * `isAlive` lets callers ignore loads that finish after teardown.
 */
export function loadTexture(
  gl: WebGLRenderingContext,
  unit: number,
  texture: WebGLTexture,
  src: string,
  format: number,
  isAlive: () => boolean,
  options: { clampLongitude?: boolean; mipmaps?: boolean } = {},
) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!isAlive()) return resolve();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, img);
      const powerOfTwo = (n: number) => (n & (n - 1)) === 0;
      const mipmaps = options.mipmaps && powerOfTwo(img.width) && powerOfTwo(img.height);
      if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.clampLongitude ? gl.CLAMP_TO_EDGE : gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });
}
