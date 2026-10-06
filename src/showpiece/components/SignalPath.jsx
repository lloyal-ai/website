import { pointOnPolyline } from '../motion/math';
import { useStageLayout } from '../playback/ShowpieceContext';
import styles from './Primitives.module.css';

/** Place inside a scene SVG. A null progress hides the token without hiding its route. */
export function SignalPath({ points, tokenPoints = points, progress = null, active = false, opacity = 1, className = '' }) {
  const { width } = useStageLayout();
  const relative = points.some(([x]) => typeof x === 'string');
  const resolved = tokenPoints.map(([x, y]) => [typeof x === 'string' ? parseFloat(x) / 100 * width : x, y]);
  const path = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
  const token = progress === null ? null : pointOnPolyline(resolved, progress);
  return (
    <g className={`${styles.signal} ${className}`} opacity={opacity} data-active={active || undefined} aria-hidden="true">
      {relative ? points.slice(1).map(([x, y], index) => <line key={index} className={styles.signalLine} x1={points[index][0]} y1={points[index][1]} x2={x} y2={y} />) : <path className={styles.signalLine} d={path} />}
      {token && <circle className={styles.signalToken} cx={token.x} cy={token.y} r="2.4" />}
    </g>
  );
}
