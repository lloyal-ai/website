import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { usePlaybackState } from '../../showpiece/playback/ShowpieceContext.js';
import { createAmbientRenderer } from './ambientRenderer.js';
import styles from './AmbientField.module.css';

const FRAME_INTERVAL = 1000 / 30;
const AmbientDiagnostics = lazy(() => import('./AmbientDiagnostics.jsx'));

/** One material beneath stationary frost, sharing the showpiece's pause control. */
export default function AmbientField() {
  const { running, reducedMotion } = usePlaybackState();
  const rootRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const frostRef = useRef(null);
  const frameObserverRef = useRef(null);
  const [diagnosticsEnabled] = useState(() => new URLSearchParams(window.location.search).has('ambient-check'));
  const controllerRef = useRef(null);
  const elapsedRef = useRef(0);
  const playbackRef = useRef({ running, reducedMotion });

  useEffect(() => {
    playbackRef.current = { running, reducedMotion };
    if (running && !reducedMotion) controllerRef.current?.start();
    else controllerRef.current?.stop();
  }, [running, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Check the browser preference directly too: the provider synchronizes it
    // in an effect, which may run after this child mounts for the first time.
    if (reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      canvas.dataset.renderer = 'reduced-motion';
      return;
    }
    const root = rootRef.current;
    const image = imageRef.current;
    const debug = diagnosticsEnabled || new URLSearchParams(window.location.search).has('ambient-debug');
    canvas.dataset.renderer = 'initializing';
    delete canvas.dataset.rendererError;
    delete canvas.dataset.diagnosticError;
    let frameId = null;
    let previousTimestamp = null;
    let lastRenderTimestamp = null;
    let loaded = false;
    let disposed = false;
    let contextLost = false;
    let failed = false;
    let renderCount = 0;
    let lastDiagnosticTime = -Infinity;

    function reportFailure(message) {
      failed = true;
      stop();
      canvas.removeAttribute('data-ready');
      canvas.dataset.renderer = 'fallback';
      canvas.dataset.rendererError = message;
      if (debug) console.warn('[Lloyal ambience]', message);
    }

    function stop() {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      previousTimestamp = null;
      lastRenderTimestamp = null;
    }

    const renderer = createAmbientRenderer(canvas, {
      onContextLost() {
        contextLost = true;
        stop();
        canvas.removeAttribute('data-ready');
        canvas.dataset.renderer = 'context-lost';
      },
      onContextRestored() {
        contextLost = false;
        failed = false;
        delete canvas.dataset.rendererError;
        // Loading may have completed while the context was unavailable, before
        // the renderer could retain the image or mark the component as ready.
        if (!loaded && image.complete && image.naturalWidth) load();
        else {
          paint();
          start();
        }
      },
      onError: reportFailure,
      onFrame: diagnosticsEnabled ? (gl, elapsed) => {
        try {
          frameObserverRef.current?.(gl, elapsed);
        } catch (error) {
          // A failed check must never be reported as a failed liquid renderer.
          frameObserverRef.current = null;
          canvas.dataset.diagnosticError = error.message || String(error);
        }
      } : undefined,
    });
    if (!renderer) return;
    canvas.dataset.renderer = 'waiting-image';

    function paint() {
      if (failed) return false;
      try {
        if (!renderer.render(elapsedRef.current)) return false;
        canvas.dataset.ready = 'true';
        canvas.dataset.renderer = 'ready';
        renderCount += 1;
        // Opt-in counters expose the actual render clock without a production
        // global or per-frame React updates. No image or playback changes.
        if (debug && elapsedRef.current - lastDiagnosticTime >= 0.5) {
          canvas.dataset.motionTime = elapsedRef.current.toFixed(3);
          canvas.dataset.renderCount = String(renderCount);
          lastDiagnosticTime = elapsedRef.current;
        }
        return true;
      } catch (error) {
        reportFailure(error.message);
        return false;
      }
    }

    function tick(timestamp) {
      frameId = null;
      const playback = playbackRef.current;
      if (disposed || contextLost || failed || !playback.running || playback.reducedMotion) return;
      if (previousTimestamp !== null) elapsedRef.current += Math.min((timestamp - previousTimestamp) / 1000, 0.1);
      previousTimestamp = timestamp;
      if (lastRenderTimestamp === null || timestamp - lastRenderTimestamp >= FRAME_INTERVAL) {
        if (!paint()) return;
        lastRenderTimestamp = timestamp - (lastRenderTimestamp === null ? 0 : (timestamp - lastRenderTimestamp) % FRAME_INTERVAL);
      }
      frameId = requestAnimationFrame(tick);
    }

    function start() {
      const playback = playbackRef.current;
      if (!disposed && !contextLost && !failed && loaded && playback.running && !playback.reducedMotion && frameId === null) frameId = requestAnimationFrame(tick);
    }

    function measure() {
      if (failed) return;
      renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
      if (loaded) paint();
    }

    function load() {
      if (disposed || failed || loaded) return;
      try {
        loaded = renderer.load(image);
        if (!loaded) return;
        measure();
        start();
      } catch (error) {
        stop();
        canvas.removeAttribute('data-ready');
        reportFailure(`Ambient texture setup failed: ${error.message}`);
      }
    }

    controllerRef.current = { start, stop };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    image.addEventListener('load', load);
    const imageFailed = () => reportFailure('Ambient material image failed to load.');
    image.addEventListener('error', imageFailed);
    if (image.complete && image.naturalWidth) load();
    else if (image.complete) imageFailed();

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      image.removeEventListener('load', load);
      image.removeEventListener('error', imageFailed);
      controllerRef.current = null;
      canvas.removeAttribute('data-ready');
      delete canvas.dataset.motionTime;
      delete canvas.dataset.renderCount;
      renderer.dispose();
    };
  }, [reducedMotion, diagnosticsEnabled]);

  return <><div className={styles.environment} ref={rootRef} aria-hidden="true">
    <img ref={imageRef} className={styles.material} src="/assets/homepage/liquid-field.webp" alt="" decoding="async" fetchPriority="high" />
    <canvas ref={canvasRef} className={`${styles.material} ${styles.canvas}`} data-playback={reducedMotion ? 'reduced-motion' : running ? 'running' : 'paused'} />
    <div className={styles.frost} ref={frostRef} />
    <div className={styles.grain} />
  </div>
    {diagnosticsEnabled && <Suspense fallback={null}>
      <AmbientDiagnostics canvasRef={canvasRef} frostRef={frostRef} observerRef={frameObserverRef} />
    </Suspense>}
  </>;
}
