import { COMPOSITIONS } from './timeline.js';

export const REASONING_MODELS = {
  qwen: { name: 'Qwen', label: 'Qwen 3.5 4B', vision: true },
  gemma: { name: 'Gemma 4', label: 'Gemma 4' },
  bonsai: { name: 'Bonsai', label: 'Bonsai 2 27B', vision: true },
  glm: { name: 'GLM 5.2', label: 'GLM 5.2' },
};

export const initialState = {
  leads: Object.fromEntries(COMPOSITIONS.map(({ id, model }) => [id, model])),
  leadMenuOpen: null, attachment: true, attachmentMenuOpen: false,
  question: null, abilityHint: null, abilities: { documents: true, corpus: true, web: false },
};

export function availableLeadModels(composition) {
  return Object.entries(REASONING_MODELS).filter(([, model]) => composition !== 'image' || model.vision);
}

export function composeReducer(state, action) {
  switch (action.type) {
    case 'lead-menu': return { ...state, leadMenuOpen: state.leadMenuOpen === action.composition ? null : action.composition };
    case 'close-lead-menu': return { ...state, leadMenuOpen: null };
    case 'select-lead': {
      if (!(action.composition in state.leads) || !availableLeadModels(action.composition).some(([id]) => id === action.value)) return state;
      return { ...state, leads: { ...state.leads, [action.composition]: action.value }, leadMenuOpen: null };
    }
    case 'attachment-menu': return { ...state, attachmentMenuOpen: !state.attachmentMenuOpen };
    case 'attachment': return { ...state, attachment: action.value, attachmentMenuOpen: false };
    case 'question': return { ...state, question: action.value };
    case 'ability': return { ...state, abilityHint: state.abilityHint === action.name ? null : action.name, abilities: { ...state.abilities, [action.name]: !state.abilities[action.name] } };
    case 'new-example': return { ...initialState, leads: state.leads };
    default: return state;
  }
}
