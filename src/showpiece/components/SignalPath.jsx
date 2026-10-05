import { pointOnPolyline } from '../motion/math';
import styles from './Primitives.module.css';

/** Place inside a scene SVG. A null progress hides the token without hiding its route. */
export function SignalPath({ points, progress = null, active = false, opacity = 1, className = '' }) {
  const path = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
  const token = progress === null ? null : pointOnPolyline(points, progress);
  return (
    <g className={`${styles.signal} ${className}`} opacity={opacity} data-active={active || undefined} aria-hidden="true">
      <path className={styles.signalLine} d={path} />
      {token && <circle className={styles.signalToken} cx={token.x} cy={token.y} r="2.4" />}
    </g>
  );
}
