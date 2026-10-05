import { useRef } from 'react';
import Showpiece from '../showpiece/Showpiece.jsx';
import { ShowpieceProvider } from '../showpiece/playback/ShowpieceProvider.jsx';
import AmbientField from './ambience/AmbientField.jsx';
import HeroIntro from './HeroIntro.jsx';
import styles from './HomepageHero.module.css';

/** The page composes the scene system; it never reaches into scene internals. */
export default function HomepageHero() {
  const heroRef = useRef(null);

  return (
    <section ref={heroRef} className={styles.hero} id="developers" aria-labelledby="hero-title">
      <ShowpieceProvider stageRef={heroRef}>
        <AmbientField />
        <HeroIntro />
        <div className={styles.showpiece}><Showpiece /></div>
        <p className={styles.placement}>On your device. On your infrastructure. At frontier scale.</p>
      </ShowpieceProvider>
    </section>
  );
}
