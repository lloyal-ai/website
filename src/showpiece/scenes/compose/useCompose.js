import { createContext, useContext } from 'react';

export const ComposeUiContext = createContext(null);
export const ComposeFrameContext = createContext(null);

export function useComposeUi() {
  const value = useContext(ComposeUiContext);
  if (!value) throw new Error('Compose controls must be rendered within ComposeProvider');
  return value;
}

export function useComposeFrame() {
  const value = useContext(ComposeFrameContext);
  if (!value) throw new Error('Compose scenes must be rendered within ComposeProvider');
  return value;
}
