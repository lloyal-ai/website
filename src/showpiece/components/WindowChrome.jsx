import styles from './Primitives.module.css';

/** Shared window controls and title layout; scenes provide their own actions. */
export function WindowChrome({ title, actions, align = 'center', className = '', ...props }) {
  return (
    <header className={`${styles.chrome} ${className}`} data-slot="chrome" data-title-alignment={align} {...props}>
      <span className={styles.traffic} data-slot="window-controls" aria-hidden="true"><i /><i /><i /></span>
      <span className={styles.windowTitle}>{title}</span>
      {actions && <span className={styles.windowAction}>{actions}</span>}
    </header>
  );
}
