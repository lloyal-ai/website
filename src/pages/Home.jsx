import { useEffect, useState } from 'react';
import HeroSection from './home/HeroSection';
import ComparisonSection from './home/ComparisonSection';
import CodeSection from './home/CodeSection';
import ProductPathSection from './home/ProductPathSection';
import ProofSection from './home/ProofSection';
import ShipSection from './home/ShipSection';
import './home/home.css';

const Home = () => {
  // Default = build (developer-led GTM, North Star = installs/week), per
  // plan §2. `data-intent` on the wrapper drives the CSS-only proof/emphasis
  // accents in home.css; `setIntent` is lifted into HeroSection's toggle.
  const [intent, setIntent] = useState('build');

  // Prototype scroll-reveal: the shipped styles.css marks elements with
  // `.reveal` but defines no corresponding visual state for it (no gating
  // opacity/transform) — reveal elements are simply visible immediately on
  // load, and app.js has no IntersectionObserver for them either. This
  // effect adds `is-visible` once a `.reveal` element enters view as
  // forward-compatible scaffolding, matching the prototype's actual
  // (no-op) behavior today rather than inventing new reveal CSS.
  useEffect(() => {
    const elements = document.querySelectorAll('.lloyal-home .reveal');
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="lloyal-home" data-intent={intent}>
      <HeroSection intent={intent} onIntentChange={setIntent} />
      <ComparisonSection />
      <CodeSection />
      <ProductPathSection />
      <ProofSection />
      <ShipSection />
    </div>
  );
};

export default Home;
