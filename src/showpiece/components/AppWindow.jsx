import { Icon } from './Icon';
import styles from './Primitives.module.css';

/** Chrome is shared; scene content, sidebar and toolbar remain independent slots. */
export function AppWindow({ title = 'Your App', className = '', style, children, toolbar, sidebar, ...props }) {
  return (
    <section className={`${styles.appWindow} ${className}`} style={style} aria-label={title} {...props}>
      <header className={styles.chrome} data-slot="chrome">
        <span className={styles.traffic} aria-hidden="true"><i /><i /><i /></span>
        <span className={styles.windowTitle}>{title}</span>
        <Icon name="panel" size={12} className={styles.windowAction} />
      </header>
      <div className={styles.windowBody} data-slot="body">
        {sidebar && <aside className={styles.sidebar} data-slot="sidebar">{sidebar}</aside>}
        <div className={styles.windowMain} data-slot="main">
          {toolbar && <div className={styles.toolbar} data-slot="toolbar">{toolbar}</div>}
          <div className={styles.windowContent} data-slot="content">{children}</div>
        </div>
      </div>
    </section>
  );
}
