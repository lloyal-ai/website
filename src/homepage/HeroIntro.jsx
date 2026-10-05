import Command from './Command.jsx';
import { Icon } from '../showpiece/components';
import styles from './HomepageHero.module.css';

const targets = [
  { label: 'Desktop', icon: 'desktop' },
  { label: 'CLI', icon: 'terminal' },
  { label: 'Web', icon: 'globe' },
];

export default function HeroIntro() {
  return (
    <div className={styles.intro}>
      <h1 id="hero-title">Ship apps that think and act.</h1>
      <p className={styles.subtitle}>Compose open-weight models in TypeScript. Ship intelligence inside your application.</p>
      <div className={styles.commandRow}>
        <Command />
        <ul className={styles.targets} role="list" aria-label="Supported app targets">
          {targets.map(({ label, icon }) => <li key={label}><Icon name={icon} size={13} /><span>{label}</span></li>)}
        </ul>
      </div>
    </div>
  );
}
