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
      <h1 id="hero-title">Agents without an API</h1>
      <p className={styles.subtitle}>
        The complete intelligence runtime you can ship inside your app.
      </p>
      <div className={styles.commandRow}>
        <Command />
        <ul className={styles.targets} role="list" aria-label="Supported app targets">
          {targets.map(({ label, icon }) => <li key={label}><Icon name={icon} size={13} /><span>{label}</span></li>)}
        </ul>
      </div>
      <p className={styles.description}>
        Write your app in <a href="https://docs.lloyal.ai/build-your-first-harness" target="_blank" rel="noreferrer">TypeScript</a>. Have it <a href="https://docs.lloyal.ai/services" target="_blank" rel="noreferrer">compose local models</a>, spawn agents that <a href="https://docs.lloyal.ai/continuous-context" target="_blank" rel="noreferrer">share attention state</a>, and use turnkey <a href="https://docs.lloyal.ai/abilities" target="_blank" rel="noreferrer">abilities</a> to perform <a href="https://docs.lloyal.ai/tools" target="_blank" rel="noreferrer">real-world tasks</a>. Ship it like a regular <a href="https://docs.lloyal.ai/ship" target="_blank" rel="noreferrer">desktop app</a> that works offline or a <a href="https://docs.lloyal.ai/serve" target="_blank" rel="noreferrer">web app</a> that serves multiple users.
      </p>
    </div>
  );
}
