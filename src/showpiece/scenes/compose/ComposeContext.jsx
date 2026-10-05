import { useMemo, useReducer } from 'react';
import { useSceneTime, usePlaybackActions, usePlaybackState } from '../../playback/ShowpieceContext';
import { compositionFrame } from './timeline';
import { ComposeUiContext, ComposeFrameContext } from './useCompose';
import { composeReducer, initialState } from './composeState';

export function ComposeProvider({ children }) {
  const time = useSceneTime();
  const playback = usePlaybackActions();
  const { reducedMotion } = usePlaybackState();
  const [state, dispatch] = useReducer(composeReducer, initialState);
  const frame = useMemo(() => compositionFrame(time), [time]);
  const ui = useMemo(() => ({ state, dispatch, playback, reducedMotion }), [state, playback, reducedMotion]);
  return <ComposeUiContext.Provider value={ui}><ComposeFrameContext.Provider value={frame}>{children}</ComposeFrameContext.Provider></ComposeUiContext.Provider>;
}
