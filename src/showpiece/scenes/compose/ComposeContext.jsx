import { useMemo, useReducer } from 'react';
import { useSceneTime, usePlaybackActions, usePlaybackState } from '../../playback/ShowpieceContext';
import { compositionFrame } from './timeline';
import { ComposeUiContext, ComposeFrameContext } from './useCompose';

const initialState = {
  lead: 'qwen', leadMenuOpen: false, attachment: true, attachmentMenuOpen: false,
  question: null, abilityHint: null, abilities: { documents: true, corpus: true, web: false },
};

function reducer(state, action) {
  switch (action.type) {
    case 'lead-menu': return { ...state, leadMenuOpen: !state.leadMenuOpen };
    case 'select-lead': return { ...state, lead: action.value, leadMenuOpen: false };
    case 'attachment-menu': return { ...state, attachmentMenuOpen: !state.attachmentMenuOpen };
    case 'attachment': return { ...state, attachment: action.value, attachmentMenuOpen: false };
    case 'question': return { ...state, question: action.value };
    case 'ability': return { ...state, abilityHint: state.abilityHint === action.name ? null : action.name, abilities: { ...state.abilities, [action.name]: !state.abilities[action.name] } };
    case 'new-example': return { ...initialState };
    default: return state;
  }
}

export function ComposeProvider({ children }) {
  const time = useSceneTime();
  const playback = usePlaybackActions();
  const { reducedMotion } = usePlaybackState();
  const [state, dispatch] = useReducer(reducer, initialState);
  const frame = useMemo(() => compositionFrame(time), [time]);
  const ui = useMemo(() => ({ state, dispatch, playback, reducedMotion }), [state, playback, reducedMotion]);
  return <ComposeUiContext.Provider value={ui}><ComposeFrameContext.Provider value={frame}>{children}</ComposeFrameContext.Provider></ComposeUiContext.Provider>;
}
