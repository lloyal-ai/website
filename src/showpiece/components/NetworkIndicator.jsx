import { Icon } from './Icon';
import styles from './Primitives.module.css';

const connections = {
  offline: { icon: 'wifiOff', label: 'Works offline' },
  connected: { icon: 'wifi', label: 'Connected to the web' },
};

/** Connection requirements belong to the illustrated app, independently of inference. */
export function NetworkIndicator({ connection, className = '' }) {
  const status = connections[connection];
  if (!status) return null;

  return <span className={`${styles.networkIndicator} ${className}`} data-connection={connection} role="img" aria-label={status.label} title={status.label}><Icon name={status.icon} size={14} /></span>;
}
