import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import HomepageHero from '../homepage/HomepageHero.jsx';
import Command from '../homepage/Command.jsx';

const element = document.getElementById('lloyal-showpiece');
if (element) createRoot(element).render(<StrictMode><HomepageHero/></StrictMode>);

const closingCommand = document.getElementById('lloyal-closing-command');
if (closingCommand) createRoot(closingCommand).render(<StrictMode><Command animate={false}/></StrictMode>);
