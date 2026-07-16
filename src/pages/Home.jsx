import { useEffect, useState } from 'react';
import HeroSection from './home/HeroSection';
import ComparisonSection from './home/ComparisonSection';
import CodeSection from './home/CodeSection';
import ProductPathSection from './home/ProductPathSection';
import ProofSection from './home/ProofSection';
import ShipSection from './home/ShipSection';
import './home/home.css';

// `intent` will grow a setter + a real toggle UI in a later phase
// (IntentToggle.jsx + intentCopy.js, per the homepage port plan §2/§5 Phase 3).
// For now it's a static default so `data-intent` is already wired for that
// follow-up without over-building a toggle nothing consumes yet.
const Home = () => {
  const [intent] = useState('build');

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
      <HeroSection />
      <ComparisonSection />
      <CodeSection />
      <ProductPathSection />
      <ProofSection />
      <ShipSection />
    </div>
  );
};

export default Home;
