import { Icon } from './Icon';
import styles from './Primitives.module.css';

export function OfflineIndicator({ className = '' }) {
  return <span className={`${styles.offlineIndicator} ${className}`} role="img" aria-label="Works offline" title="Works offline"><Icon name="wifiOff" size={14} /></span>;
}
