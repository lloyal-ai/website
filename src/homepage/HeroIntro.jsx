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
      <h1 id="hero-title">Turn open models into AI apps people can download.</h1>
      <p className={styles.subtitle}>Start with a working TypeScript AI app with built-in inference and a multi-agent runtime. Your in-app agents can research, read local files, understand documents and compose specialist models.</p>
      <div className={styles.commandRow}>
        <Command />
        <ul className={styles.targets} role="list" aria-label="Supported app targets">
          {targets.map(({ label, icon }) => <li key={label}><Icon name={icon} size={13} /><span>{label}</span></li>)}
        </ul>
      </div>
    </div>
  );
}
