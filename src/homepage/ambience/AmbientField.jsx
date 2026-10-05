import { useEffect, useRef } from 'react';
import { usePlaybackState } from '../../showpiece/playback/ShowpieceContext.js';
import { createAmbientRenderer } from './ambientRenderer.js';
import styles from './AmbientField.module.css';

const FRAME_INTERVAL = 1000 / 30;

/** One material beneath stationary frost, sharing the showpiece's pause control. */
export default function AmbientField() {
  const { running, reducedMotion } = usePlaybackState();
  const rootRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
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
    if (reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = rootRef.current;
    const image = imageRef.current;
    let frameId = null;
    let previousTimestamp = null;
    let lastRenderTimestamp = null;
    let loaded = false;
    let disposed = false;
    let contextLost = false;
    let failed = false;

    function showFallback() {
      failed = true;
      stop();
      canvas.removeAttribute('data-ready');
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
      },
      onContextRestored() {
        contextLost = false;
        failed = false;
        // Loading may have completed while the context was unavailable, before
        // the renderer could retain the image or mark the component as ready.
        if (!loaded && image.complete && image.naturalWidth) load();
        else {
          paint();
          start();
        }
      },
      onError: showFallback,
    });
    if (!renderer) return;

    function paint() {
      if (failed) return false;
      try {
        if (!renderer.render(elapsedRef.current)) return false;
        canvas.dataset.ready = 'true';
        return true;
      } catch {
        showFallback();
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
      } catch {
        showFallback();
      }
    }

    controllerRef.current = { start, stop };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    image.addEventListener('load', load);
    image.addEventListener('error', showFallback);
    if (image.complete && image.naturalWidth) load();
    else if (image.complete) showFallback();

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      image.removeEventListener('load', load);
      image.removeEventListener('error', showFallback);
      controllerRef.current = null;
      canvas.removeAttribute('data-ready');
      renderer.dispose();
    };
  }, [reducedMotion]);

  return <div className={styles.environment} ref={rootRef} aria-hidden="true">
    <img ref={imageRef} className={styles.material} src="/assets/homepage/liquid-field.webp" alt="" decoding="async" fetchPriority="high" />
    <canvas ref={canvasRef} className={`${styles.material} ${styles.canvas}`} />
    <div className={styles.frost} />
    <div className={styles.grain} />
  </div>;
}
