import { Icon } from '../../components';
import styles from './ComposeScene.module.css';

export function SourcePill({ children, document = true }) {
  return <span className={styles.sourcePill}>{document && <Icon name="document" size={12} />}{children}</span>;
}

export function SourcePills() {
  return <div className={styles.sourcePills}><SourcePill>architecture.md</SourcePill><SourcePill>research-notes.pdf</SourcePill></div>;
}

export function AppToolbar({ title = 'Research brief', state = 'Ready', working = false }) {
  return <div className={styles.toolbar}><Icon name="document" size={12} /><span>{title}</span><span className={styles.runState} data-status={working ? 'working' : state === 'Settled' ? 'settled' : 'ready'}><i />{state}</span><Icon name="copy" size={11} /></div>;
}

export function ReportHeading() {
  return <header className={styles.reportHeading}><h2>Research brief</h2><p>Built from your local documents</p></header>;
}

export function ReportRow({ number, title, children, className = '', style }) {
  return <section className={`${styles.reportRow} ${className}`} style={style}><span className={styles.number}>{number}</span><div><h3>{title}</h3>{children}</div></section>;
}

export function Findings() {
  return <><p>Evidence linked to every finding.</p><SourcePills /></>;
}

export function Sidebar({ wiki }) {
  return <aside className={styles.sidebar}><div className={styles.appBrand}><Icon name="panel" size={20} />Your App</div><div className={styles.sidebarLabel}>Library · 1</div><div className={styles.libraryEntry}>{wiki ? 'Product wiki' : 'Research brief'}<small>{wiki ? 'Alpine field guide' : 'Just now'}</small></div><div className={styles.localStatus}><i />Working locally<br />On this machine</div></aside>;
}
