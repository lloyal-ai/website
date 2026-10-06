import { ModelMark } from './ModelMark';
import styles from './Primitives.module.css';

export function ModelTile({ model = 'qwen', label, role, status, active = false, small = false, responsive = false, className = '', style, children }) {
  return (
    <div className={`${styles.modelTile} ${small ? styles.small : ''} ${responsive ? styles.responsive : ''} ${className}`} style={style} data-active={active || undefined}>
      {status && <div className={styles.modelStatus}>{status}</div>}
      <div className={styles.modelFace} data-model={model}>
        <ModelMark model={model} />
        {children}
      </div>
      {label && <div className={styles.modelLabel}>{label}</div>}
      {role && <div className={styles.modelRole}>{role}</div>}
    </div>
  );
}
