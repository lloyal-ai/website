import { useContext, useSyncExternalStore } from 'react';
import { PlaybackContext, StageLayoutContext } from './contexts.js';

function usePlaybackStore() {
  const store = useContext(PlaybackContext);
  if (!store) throw new Error('Showpiece hooks require a ShowpieceProvider.');
  return store;
}

export function useSceneTime() {
  const store = usePlaybackStore();
  return useSyncExternalStore(store.subscribeTime, store.getTime, store.getTime);
}

export function usePlaybackState() {
  const store = usePlaybackStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function usePlaybackActions() { return usePlaybackStore().actions; }
export function useStageLayout() { return useContext(StageLayoutContext); }
