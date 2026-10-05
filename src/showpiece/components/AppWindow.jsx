import { Icon } from './Icon';
import { OfflineIndicator } from './OfflineIndicator';
import { WindowChrome } from './WindowChrome';
import styles from './Primitives.module.css';

/** Chrome is shared; scene content, sidebar and toolbar remain independent slots. */
export function AppWindow({ title = 'Your App', chromeIcon = 'panel', offline = false, className = '', style, children, toolbar, sidebar, ...props }) {
  return (
    <section className={`${styles.appWindow} ${className}`} style={style} aria-label={title} {...props}>
      <WindowChrome title={title} actions={<>{offline && <OfflineIndicator />}<Icon name={chromeIcon} size={12} /></>} />
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
