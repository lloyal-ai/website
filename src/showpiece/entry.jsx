import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import HomepageHero from '../homepage/HomepageHero.jsx';

const element = document.getElementById('lloyal-showpiece');
if (element) createRoot(element).render(<StrictMode><HomepageHero/></StrictMode>);
