import Command from './Command.jsx';
import styles from './HomepageHero.module.css';

export default function HeroIntro() {
  return (
    <div className={styles.intro}>
      <h1 id="hero-title">Ship apps that think and act.</h1>
      <p className={styles.subtitle}>Compose open-weight models in TypeScript. Ship intelligence inside your application.</p>
      <div className={styles.commandRow}><Command /></div>
    </div>
  );
}
