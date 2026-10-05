const MAX_PIXELS = 1920 * 1080;
const MAX_PIXEL_RATIO = 1.5;

const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_material;
  uniform vec2 u_cover;
  uniform float u_aspect;
  uniform float u_time;
  varying vec2 v_uv;

  vec2 flow(vec2 p, float t) {
    // Broad, coupled folds move through one continuous surface. Subtracting
    // the initial field below preserves the approved image at time zero.
    return vec2(
      sin(p.y * 3.1 + sin(p.x * 1.7 + t * 0.73) * 0.55 + t),
      sin(p.x * 2.4 + sin(p.y * 2.0 - t * 0.61) * 0.45 - t * 0.82)
    );
  }

  void main() {
    vec2 p = v_uv * vec2(u_aspect, 1.0);
    float t = u_time * 0.085;
    vec2 displacement = (flow(p, t) - flow(p, 0.0)) * vec2(0.009, 0.012);
    vec2 uv = 0.5 + (v_uv + displacement - 0.5) * u_cover;
    // The material supplies all colour and luminance. Frost stays in CSS.
    gl_FragColor = texture2D(u_material, uv);
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const detail = gl.getShaderInfoLog(shader) || 'No driver message.';
    gl.deleteShader(shader);
    throw new Error(`Ambient ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader failed: ${detail}`);
  }
  return shader;
}

/** GPU resources only. React owns visibility, playback, loading and the clock. */
export function createAmbientRenderer(canvas, { onContextLost, onContextRestored, onError } = {}) {
  let gl;
  let contextMessage = '';
  const creationFailed = (event) => { contextMessage = event.statusMessage || ''; };
  canvas.addEventListener('webglcontextcreationerror', creationFailed);
  try {
    gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
  } catch (error) {
    onError?.(`WebGL context creation failed: ${error.message}`);
    return null;
  } finally {
    canvas.removeEventListener('webglcontextcreationerror', creationFailed);
  }
  if (!gl) {
    onError?.(`WebGL context unavailable.${contextMessage ? ` ${contextMessage}` : ''}`);
    return null;
  }

  let resources = null;
  let sourceImage = null;
  let lost = false;
  let disposed = false;
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let firstDraw = true;
  const sizeLimit = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));

  function checkError(operation) {
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`Ambient ${operation} failed: WebGL error 0x${error.toString(16)}.`);
  }

  function release() {
    if (!resources) return;
    gl.deleteTexture(resources.texture);
    gl.deleteBuffer(resources.buffer);
    gl.deleteProgram(resources.program);
    resources = null;
  }

  function initialize() {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    let fragment;
    let program;
    try {
      fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Ambient shader link failed: ${gl.getProgramInfoLog(program) || 'No driver message.'}`);
    } catch (error) {
      if (program) gl.deleteProgram(program);
      throw error;
    } finally {
      gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    resources = {
      program, buffer, texture,
      position: gl.getAttribLocation(program, 'a_position'),
      material: gl.getUniformLocation(program, 'u_material'),
      cover: gl.getUniformLocation(program, 'u_cover'),
      aspect: gl.getUniformLocation(program, 'u_aspect'),
      time: gl.getUniformLocation(program, 'u_time'),
    };
    firstDraw = true;
    checkError('initialization');
  }

  function load(image) {
    if (disposed || lost || !resources || !image.naturalWidth) return false;
    sourceImage = image;
    gl.bindTexture(gl.TEXTURE_2D, resources.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    checkError('texture upload');
    return true;
  }

  function resize(nextWidth, nextHeight, nextPixelRatio = 1) {
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
    pixelRatio = nextPixelRatio;
    const scale = Math.min(nextPixelRatio, MAX_PIXEL_RATIO, Math.sqrt(MAX_PIXELS / (width * height)), sizeLimit / width, sizeLimit / height);
    const nextBufferWidth = Math.max(1, Math.round(width * scale));
    const nextBufferHeight = Math.max(1, Math.round(height * scale));
    if (canvas.width !== nextBufferWidth || canvas.height !== nextBufferHeight) {
      canvas.width = nextBufferWidth;
      canvas.height = nextBufferHeight;
    }
  }

  function render(elapsed) {
    if (disposed || lost || !resources || !sourceImage) return false;
    const aspect = width / height;
    const imageAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(resources.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, resources.buffer);
    gl.enableVertexAttribArray(resources.position);
    gl.vertexAttribPointer(resources.position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, resources.texture);
    gl.uniform1i(resources.material, 0);
    gl.uniform2f(resources.cover, Math.min(1, aspect / imageAspect), Math.min(1, imageAspect / aspect));
    gl.uniform1f(resources.aspect, aspect);
    gl.uniform1f(resources.time, elapsed);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (firstDraw) {
      checkError('first draw');
      firstDraw = false;
    }
    return true;
  }

  function handleLost(event) {
    event.preventDefault();
    lost = true;
    resources = null;
    onContextLost?.();
  }

  function handleRestored() {
    if (disposed) return;
    try {
      lost = false;
      initialize();
      if (sourceImage) load(sourceImage);
      resize(width, height, pixelRatio);
      onContextRestored?.();
    } catch (error) {
      release();
      onContextLost?.();
      onError?.(error.message);
    }
  }

  try {
    initialize();
  } catch (error) {
    release();
    onError?.(error.message);
    return null;
  }
  canvas.addEventListener('webglcontextlost', handleLost);
  canvas.addEventListener('webglcontextrestored', handleRestored);

  return {
    load, resize, render,
    dispose() {
      disposed = true;
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
      release();
      sourceImage = null;
    },
  };
}
