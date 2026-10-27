/* Original About-only experiment. No libraries or remote assets. */
(() => {
  'use strict';
  const host = document.querySelector('.about-photo');
  const image = host?.querySelector('img');
  if (!image) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 760px)');
  const canvas = document.createElement('canvas');
  canvas.className = 'particle-portrait';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: false });
  if (!gl) return;

  let program, positionsBuffer, colorsBuffer, reliefBuffer, sizeUniform, viewUniform, restDepthUniform;
  let source, points, velocity, colors, depthProfile, count = 0;
  let width = 0, height = 0, spacing = 1, frame = 0, previous = 0;
  let visible = false, ready = false, lost = false, dirty = true, disposed = false;
  let sourceURL = '', buildID = 0, resizeFrame = 0;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false, down: false };
  let touch = null, holdTimer = 0;

  function seededDepth(x, y) {
    // Fixed coordinate seed: repeatable across interactions and same-size rebuilds.
    let seed = (x ^ Math.imul(y, 0x85ebca6b) ^ 0x4d494b4b) >>> 0;
    seed = Math.imul(seed ^ (seed >>> 16), 0x7feb352d);
    seed = Math.imul(seed ^ (seed >>> 15), 0x846ca68b);
    return ((seed ^ (seed >>> 16)) >>> 0) / 4294967295 * 2 - 1;
  }

  // Smooth, fixed local noise: neighboring particles share a depth contour.
  // Evaluate only when sampling the photo, so noise never flickers during motion.
  function localNoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const hash = (a, b) => {
      const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return (value - Math.floor(value)) * 2 - 1;
    };
    const a = hash(ix, iy), b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  }

  function shader(type, code) {
    const result = gl.createShader(type);
    gl.shaderSource(result, code);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      gl.deleteShader(result);
      throw new Error('Portrait shader unavailable');
    }
    return result;
  }

  function setup() {
    const vertex = shader(gl.VERTEX_SHADER, `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      attribute float aRelief;
      uniform vec2 uView;
      uniform float uSize;
      uniform float uRestDepth;
      varying vec4 vColor;
      void main() {
        // Compensate the resting relief so zero scatter projects precisely onto
        // the sampled image coordinates, including the original point sizes.
        float restDistance = 650.0 - aRelief * uRestDepth;
        float perspective = restDistance / (restDistance - aPosition.z);
        vec2 projected = (aPosition.xy - uView * 0.5) * perspective + uView * 0.5;
        gl_Position = vec4(projected.x / uView.x * 2.0 - 1.0, 1.0 - projected.y / uView.y * 2.0, 0.0, 1.0);
        gl_PointSize = uSize * perspective;
        vColor = aColor;
      }
    `);
    const fragment = shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec4 vColor;
      void main() {
        float edge = 1.0 - smoothstep(0.43, 0.5, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vColor.rgb, vColor.a * edge);
      }
    `);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Portrait program unavailable');
    gl.useProgram(program);
    positionsBuffer = gl.createBuffer();
    colorsBuffer = gl.createBuffer();
    reliefBuffer = gl.createBuffer();
    for (const [name, buffer, components] of [['aPosition', positionsBuffer, 3], ['aColor', colorsBuffer, 4], ['aRelief', reliefBuffer, 1]]) {
      const location = gl.getAttribLocation(program, name);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, components, gl.FLOAT, false, 0, 0);
    }
    sizeUniform = gl.getUniformLocation(program, 'uSize');
    viewUniform = gl.getUniformLocation(program, 'uView');
    restDepthUniform = gl.getUniformLocation(program, 'uRestDepth');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  function fallback() {
    ready = false;
    pointer.active = pointer.down = false;
    clearTimeout(holdTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    host.classList.remove('particles-ready');
    canvas.hidden = true;
  }

  async function build() {
    const id = ++buildID;
    if (disposed || reduced.matches || lost) return fallback();
    try {
      await image.decode();
      if (id !== buildID || reduced.matches || lost || disposed) return;
      const style = getComputedStyle(image);
      width = image.clientWidth;
      height = image.clientHeight;
      if (!width || !height) return;
      sourceURL = image.currentSrc;
      // Follow the existing image box, including the narrow-screen object-fit crop.
      Object.assign(canvas.style, { left: `${image.offsetLeft}px`, top: `${image.offsetTop}px`, width: `${width}px`, height: `${height}px` });
      const lowPower = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 8) <= 4;
      const target = compact.matches ? (lowPower ? 4500 : 7000) : (lowPower ? 18000 : 28000);
      const columns = Math.max(1, Math.round(Math.sqrt(target * width / height)));
      const rows = Math.max(1, Math.round(target / columns));
      const sample = document.createElement('canvas');
      sample.width = columns;
      sample.height = rows;
      const context = sample.getContext('2d', { willReadFrequently: true });
      if (style.objectFit === 'cover') {
        const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
        const sw = width / scale, sh = height / scale;
        context.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, 0, 0, columns, rows);
      } else {
        context.drawImage(image, 0, 0, columns, rows);
      }
      const pixels = context.getImageData(0, 0, columns, rows).data;
      const coordinates = [], rgba = [], depth = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const p = (y * columns + x) * 4;
        if (pixels[p + 3] < 16) continue;
        coordinates.push((x + 0.5) * width / columns, (y + 0.5) * height / rows, 0);
        rgba.push(pixels[p] / 255, pixels[p + 1] / 255, pixels[p + 2] / 255, pixels[p + 3] / 255);
        const luminance = (0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]) / 255;
        const noise = localNoise((x + 0.5) / columns * 10, (y + 0.5) / rows * 10);
        // Luminance gives broad relief, local noise gives contours, and each point
        // gets a small, fixed depth variance without changing its sampled RGB.
        // This is an artistic relief map, not an estimate of anatomical depth.
        depth.push((luminance * 2 - 1) * 0.64 + noise * 0.24 + seededDepth(x, y) * 0.12);
      }
      source = new Float32Array(coordinates);
      points = source.slice();
      velocity = new Float32Array(source.length);
      colors = new Float32Array(rgba);
      depthProfile = new Float32Array(depth);
      count = depthProfile.length;
      spacing = Math.max(width / columns, height / rows);
      // Supersampling keeps tiny dots smooth even on a 1x display.
      const dpr = 2;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(viewUniform, width, height);
      gl.uniform1f(sizeUniform, spacing * 1.22 * dpr);
      // Shallow resting relief is projection-compensated to preserve the image.
      // Interaction reveals it through additional spring-driven depth.
      gl.uniform1f(restDepthUniform, Math.min(1.5, width * 0.004));
      gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, points, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, reliefBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, depthProfile, gl.STATIC_DRAW);
      canvas.dataset.particles = count;
      canvas.hidden = false;
      ready = dirty = true;
      draw();
      host.classList.add('particles-ready');
      wake();
    } catch {
      fallback();
    }
  }

  function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, points);
    gl.drawArrays(gl.POINTS, 0, count);
  }

  function wake() {
    if (!frame && ready && visible && !document.hidden && !reduced.matches) {
      previous = 0;
      frame = requestAnimationFrame(animate);
    }
  }

  function animate(now) {
    frame = 0;
    if (!ready || !visible || document.hidden || reduced.matches) return;
    const dt = previous ? Math.min((now - previous) / 1000, 1 / 30) : 1 / 60;
    previous = now;
    const follow = 1 - Math.exp(-dt * 17);
    pointer.x += (pointer.targetX - pointer.x) * follow;
    pointer.y += (pointer.targetY - pointer.y) * follow;
    const radius = Math.min(width * (pointer.down ? 0.43 : 0.29), pointer.down ? 155 : 110);
    const drag = Math.exp(-8.5 * dt);
    let moving = false;
    for (let n = 0, i = 0; n < count; n++, i += 3) {
      const dx = source[i] - pointer.x, dy = source[i + 1] - pointer.y;
      const distance = Math.hypot(dx, dy);
      const proximity = pointer.active ? Math.max(0, 1 - distance / radius) : 0;
      const strength = pointer.down ? 6200 : 1100;
      const force = proximity * proximity * strength;
      const direction = Math.max(distance, 1);
      const ax = dx / direction * force;
      const ay = dy / direction * force;
      // Distance amplifies the shallow resting relief only near the pointer.
      const depthEnvelope = proximity * proximity * (3 - 2 * proximity);
      const az = strength * depthEnvelope * depthProfile[n];
      for (let axis = 0; axis < 3; axis++) {
        const k = i + axis;
        const acceleration = axis === 0 ? ax : axis === 1 ? ay : az;
        velocity[k] = (velocity[k] + ((source[k] - points[k]) * 48 + acceleration) * dt) * drag;
        points[k] += velocity[k] * dt;
        if (Math.abs(source[k] - points[k]) > 0.005 || Math.abs(velocity[k]) > 0.01) moving = true;
      }
    }
    if (!moving && !pointer.active) {
      points.set(source);
      velocity.fill(0);
    }
    draw();
    dirty = moving;
    if (moving || pointer.active) frame = requestAnimationFrame(animate);
  }

  function locate(event, reset = false) {
    const box = canvas.getBoundingClientRect();
    pointer.targetX = (event.clientX - box.left) * width / box.width;
    pointer.targetY = (event.clientY - box.top) * height / box.height;
    if (reset) { pointer.x = pointer.targetX; pointer.y = pointer.targetY; }
  }
  function release() {
    clearTimeout(holdTimer);
    pointer.active = pointer.down = false;
    touch = null;
    wake();
  }
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') {
      if (!touch || touch.id !== event.pointerId || touch.scrolling) return;
      const dx = Math.abs(event.clientX - touch.x), dy = Math.abs(event.clientY - touch.y);
      if (!touch.dragging && dy > 7 && dy > dx * 0.85) {
        touch.scrolling = true;
        pointer.active = pointer.down = false;
        clearTimeout(holdTimer);
        return;
      }
      if (!touch.dragging && dx > 8 && dx > dy * 1.2) {
        touch.dragging = true;
        clearTimeout(holdTimer);
        canvas.setPointerCapture(event.pointerId);
      }
      if (!touch.dragging) return;
      pointer.down = true;
    }
    locate(event, !pointer.active);
    pointer.active = true;
    wake();
  }, { passive: true });
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' && event.button !== 0) return;
    locate(event, true);
    if (event.pointerType === 'touch') {
      if (touch) { release(); return; }
      touch = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false, scrolling: false };
      holdTimer = setTimeout(() => {
        if (!touch || touch.scrolling) return;
        pointer.active = pointer.down = true;
        wake();
      }, 220);
    } else {
      pointer.active = pointer.down = true;
      canvas.setPointerCapture(event.pointerId);
      wake();
    }
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { if (!touch?.dragging) release(); });
  canvas.addEventListener('lostpointercapture', release);
  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('pointercancel', release, { passive: true });
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); else wake(); });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; fallback(); });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    try { setup(); build(); } catch { fallback(); }
  });
  reduced.addEventListener('change', () => { release(); reduced.matches ? fallback() : build(); });
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { if (dirty) wake(); } else release();
  });
  observer.observe(host);
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (image.clientWidth !== width || image.clientHeight !== height || image.currentSrc !== sourceURL) {
        release();
        build();
      }
    });
  }).observe(image);
  image.addEventListener('load', build);
  window.addEventListener('pagehide', event => {
    release();
    if (!event.persisted) {
      disposed = true;
      observer.disconnect();
      fallback();
      gl.deleteBuffer(positionsBuffer);
      gl.deleteBuffer(colorsBuffer);
      gl.deleteBuffer(reliefBuffer);
      gl.deleteProgram(program);
    }
  });
  try {
    setup();
    host.append(canvas);
    build();
  } catch { fallback(); }
})();
