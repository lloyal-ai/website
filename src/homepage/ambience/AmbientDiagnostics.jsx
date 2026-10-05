import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './AmbientDiagnostics.module.css';

const MEASUREMENT_SECONDS = 5;
const MEASUREMENT_TIMEOUT = 12000;
const PROBE_TIMEOUT = 10000;

function readFrame(gl) {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const error = gl.getError();
  if (error !== gl.NO_ERROR) throw new Error(`GPU readback failed (0x${error.toString(16)}).`);
  return { width, height, pixels };
}

function compareFrames(before, after) {
  let difference = 0;
  let changed = 0;
  for (let i = 0; i < before.pixels.length; i += 4) {
    const pixelDifference = Math.abs(before.pixels[i] - after.pixels[i])
      + Math.abs(before.pixels[i + 1] - after.pixels[i + 1])
      + Math.abs(before.pixels[i + 2] - after.pixels[i + 2]);
    difference += pixelDifference;
    if (pixelDifference) changed += 1;
  }
  const pixelCount = before.width * before.height;
  return { mean: difference / (pixelCount * 3), changed: changed / pixelCount * 100 };
}

function drawProbe(gl, elapsed, cssWidth) {
  const scissorEnabled = gl.isEnabled(gl.SCISSOR_TEST);
  const scissor = gl.getParameter(gl.SCISSOR_BOX);
  const clearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
  const colorMask = gl.getParameter(gl.COLOR_WRITEMASK);
  const width = gl.drawingBufferWidth;
  const bandWidth = Math.min(width, Math.round(140 * width / Math.max(cssWidth, 1)));
  const x = Math.round((width - bandWidth) * (1 - Math.cos(elapsed * Math.PI / 2)) / 2);
  try {
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, 0, bandWidth, gl.drawingBufferHeight);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0.95, 0.95, 0.95, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  } finally {
    gl.scissor(...scissor);
    gl.colorMask(...colorMask);
    gl.clearColor(...clearColor);
    if (!scissorEnabled) gl.disable(gl.SCISSOR_TEST);
  }
}

function exitHref() {
  const url = new URL(window.location.href);
  url.searchParams.delete('ambient-check');
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Query-only controls. The normal image, shader and playback remain unchanged. */
export default function AmbientDiagnostics({ canvasRef, frostRef, observerRef }) {
  const controlsRef = useRef(null);
  const [status, setStatus] = useState({ renderer: 'initializing', playback: 'unknown', reducedMotion: false });
  const [measurement, setMeasurement] = useState(null);
  const [measuring, setMeasuring] = useState(false);
  const [probeActive, setProbeActive] = useState(false);
  const [frostHidden, setFrostHidden] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frost = frostRef.current;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const originalVisibility = frost.style.getPropertyValue('visibility');
    const originalPriority = frost.style.getPropertyPriority('visibility');
    let sample = null;
    let measureTimer = null;
    let probe = null;
    let probeTimer = null;
    let lastGl = null;
    let previousStatus = null;
    let disposed = false;

    function canRun() {
      return canvas.dataset.renderer === 'ready'
        && canvas.dataset.playback === 'running'
        && !canvas.dataset.diagnosticError
        && !preference.matches && !document.hidden;
    }

    function finishMeasurement(result) {
      clearTimeout(measureTimer);
      measureTimer = null;
      sample = null;
      if (!disposed) {
        setMeasuring(false);
        setMeasurement(result);
      }
    }

    function stopProbe() {
      clearTimeout(probeTimer);
      probeTimer = null;
      const wasActive = probe !== null;
      probe = null;
      // Redraw the original material even if playback stopped after the last
      // probe frame. The probe never changes its program, uniforms or buffers.
      if (wasActive && canvas.isConnected && canvas.dataset.ready === 'true'
        && canvas.dataset.renderer === 'ready' && lastGl && !lastGl.isContextLost()) {
        lastGl.drawArrays(lastGl.TRIANGLE_STRIP, 0, 4);
      }
      if (!disposed) setProbeActive(false);
    }

    function syncStatus() {
      const { renderer, playback, rendererError, diagnosticError, renderCount, motionTime } = canvas.dataset;
      const nextStatus = { renderer, playback, error: rendererError || diagnosticError, renderCount, motionTime, reducedMotion: preference.matches };
      if (!previousStatus || Object.keys(nextStatus).some((key) => previousStatus[key] !== nextStatus[key])) {
        previousStatus = nextStatus;
        setStatus(nextStatus);
      }
      if (!canRun()) {
        if (sample) finishMeasurement({ error: 'Measurement stopped: playback is paused or the renderer is unavailable. Resume the showpiece and retry.' });
        if (probe) stopProbe();
      }
    }

    function restoreFrost() {
      if (originalVisibility) frost.style.setProperty('visibility', originalVisibility, originalPriority);
      else frost.style.removeProperty('visibility');
    }

    const observeFrame = (gl, elapsed) => {
      lastGl = gl;
      // Read immediately after the original draw. A later read can be empty
      // because WebGL does not preserve the drawing buffer after presentation.
      if (sample) {
        try {
          if (!sample.before) sample = { ...sample, before: readFrame(gl), elapsed };
          else if (sample.before.width !== gl.drawingBufferWidth || sample.before.height !== gl.drawingBufferHeight) {
            finishMeasurement({ error: 'Canvas resized during measurement. Keep the page still and retry.' });
          } else if (elapsed - sample.elapsed >= MEASUREMENT_SECONDS) {
            const result = compareFrames(sample.before, readFrame(gl));
            finishMeasurement({ ...result, seconds: elapsed - sample.elapsed });
          }
        } catch (error) {
          finishMeasurement({ error: error.message });
        }
      }
      // The visual probe is deliberately excluded from pixel measurements.
      if (probe) {
        if (probe.elapsed === null) probe.elapsed = elapsed;
        drawProbe(gl, elapsed - probe.elapsed, canvas.clientWidth);
      }
    };

    controlsRef.current = {
      measure() {
        if (!canRun()) return;
        sample = { before: null };
        clearTimeout(measureTimer);
        measureTimer = setTimeout(() => finishMeasurement({ error: 'Not enough rendered time within 12 seconds. Keep the hero visible and playing, then retry.' }), MEASUREMENT_TIMEOUT);
        setMeasuring(true);
        setMeasurement(null);
      },
      toggleProbe() {
        if (probe) stopProbe();
        else if (canRun()) {
          probe = { elapsed: null };
          probeTimer = setTimeout(stopProbe, PROBE_TIMEOUT);
          setProbeActive(true);
        }
      },
      toggleFrost() {
        if (frost.style.visibility === 'hidden') {
          restoreFrost();
          setFrostHidden(false);
        } else {
          frost.style.setProperty('visibility', 'hidden');
          setFrostHidden(true);
        }
      },
    };
    observerRef.current = observeFrame;
    const observer = new MutationObserver(syncStatus);
    observer.observe(canvas, { attributes: true, attributeFilter: ['data-renderer', 'data-playback', 'data-renderer-error', 'data-diagnostic-error', 'data-render-count', 'data-motion-time'] });
    preference.addEventListener('change', syncStatus);
    document.addEventListener('visibilitychange', syncStatus);
    const initialFrame = requestAnimationFrame(syncStatus);

    return () => {
      disposed = true;
      cancelAnimationFrame(initialFrame);
      observer.disconnect();
      preference.removeEventListener('change', syncStatus);
      document.removeEventListener('visibilitychange', syncStatus);
      clearTimeout(measureTimer);
      sample = null;
      stopProbe();
      restoreFrost();
      if (observerRef.current === observeFrame) observerRef.current = null;
      controlsRef.current = null;
    };
  }, [canvasRef, frostRef, observerRef]);

  const canRun = status.renderer === 'ready' && status.playback === 'running' && !status.reducedMotion && !status.error;
  return createPortal(<section className={styles.panel} aria-label="Ambient motion diagnostics" data-testid="ambient-diagnostics" data-frost-hidden={frostHidden}>
    <header className={styles.header}>
      <h2>Motion check</h2>
      <a href={exitHref()}>Exit check</a>
    </header>
    <dl className={styles.status}>
      <div><dt>Renderer</dt><dd>{status.renderer || 'initializing'}</dd></div>
      <div><dt>Playback</dt><dd>{status.playback || 'unknown'}</dd></div>
      <div><dt>Reduce Motion</dt><dd>{status.reducedMotion ? 'on' : 'off'}</dd></div>
      <div><dt>Clock / frames</dt><dd>{status.motionTime || '0'}s / {status.renderCount || '0'}</dd></div>
    </dl>
    {status.error && <p className={styles.error}>{status.error}</p>}
    {!canRun && <p className={styles.note}>Tests require the hero to be visible and playing, with Reduce Motion off and WebGL available.</p>}
    <div className={styles.controls}>
      <button type="button" disabled={!canRun || measuring} onClick={() => controlsRef.current?.measure()}>{measuring ? 'Measuring…' : 'Measure 5 seconds'}</button>
      <button type="button" disabled={!canRun && !probeActive} onClick={() => controlsRef.current?.toggleProbe()}>{probeActive ? 'Stop test band' : 'Show moving test band'}</button>
      <button type="button" aria-pressed={frostHidden} onClick={() => controlsRef.current?.toggleFrost()}>{frostHidden ? 'Restore frost' : 'Hide frost temporarily'}</button>
    </div>
    <div className={styles.result} data-testid="ambient-pixel-result" role="status">
      {measuring ? 'Measuring original liquid pixels, before frost and any test band…'
        : measurement?.error ? measurement.error
          : measurement ? <><strong>GPU pixels: {measurement.mean.toFixed(3)} / 255 mean RGB change</strong><span>{measurement.changed.toFixed(2)}% of pixels changed over {measurement.seconds.toFixed(1)} seconds.</span><span>This measures canvas output, not what reached your screen.</span></>
            : 'Measure the liquid first, then watch the test band with frost on and off.'}
    </div>
    {probeActive && <div className={styles.reference}>
      <span>Page reference — should move too</span>
      <div className={styles.referenceTrack}><i /></div>
      <p>Temporary white band inside the liquid canvas. Stops after 10 seconds.</p>
    </div>}
    <p className={styles.privacy}>Local test only. Nothing is sent.</p>
  </section>, document.body);
}
