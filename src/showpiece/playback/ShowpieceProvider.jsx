import { useEffect, useState } from 'react';
import { createPlaybackStore } from './playbackStore.js';
import { PlaybackContext } from './contexts.js';

export function ShowpieceProvider({ children, stageRef }) {
  const [store] = useState(() => createPlaybackStore());
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => store.setReducedMotion(media.matches);
    const syncVisibility = () => store.setEnvironment({ visible: document.visibilityState === 'visible' });
    syncMotion();
    syncVisibility();
    media.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    const observer = new IntersectionObserver(([entry]) => store.setEnvironment({ inView: entry.isIntersecting }), { threshold: 0.12 });
    if (stageRef.current) observer.observe(stageRef.current);
    store.mount();
    // The development-only harness exercises the same public actions as the UI.
    if (import.meta.env.DEV) window.__showpiece = store;
    return () => {
      observer.disconnect();
      media.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
      store.unmount();
      if (import.meta.env.DEV && window.__showpiece === store) delete window.__showpiece;
    };
  }, [stageRef, store]);
  return <PlaybackContext value={store}>{children}</PlaybackContext>;
}
