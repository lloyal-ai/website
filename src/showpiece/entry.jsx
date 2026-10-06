import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import HomepageHero from '../homepage/HomepageHero.jsx';
import Command from '../homepage/Command.jsx';

function mountIsland(id, component) {
  const element = document.getElementById(id);
  if (!element) return;
  const content = <StrictMode>{component}</StrictMode>;
  if (element.dataset.prerendered === 'true') hydrateRoot(element, content);
  else createRoot(element).render(content);
}

mountIsland('lloyal-showpiece', <HomepageHero />);
mountIsland('lloyal-closing-command', <Command animate={false} />);
