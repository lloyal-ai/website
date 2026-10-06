import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import HomepageHero from './HomepageHero.jsx';
import Command from './Command.jsx';

/** Render the same component trees that the browser hydrates. */
export function renderHomepage() {
  return {
    hero: renderToString(<StrictMode><HomepageHero /></StrictMode>),
    command: renderToString(<StrictMode><Command animate={false} /></StrictMode>),
  };
}
