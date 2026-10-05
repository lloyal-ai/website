import { useId } from 'react';
import { useSceneTime } from '../../playback/ShowpieceContext';
import { progress } from '../../motion/math';
import { epistemicsTrace } from './epistemicsTrace';
import styles from './InspectScene.module.css';

/** Captured curve geometry only: the reveal supplies pacing, never fabricated samples. */
export default function EpistemicsChart() {
  const time = useSceneTime();
  const clipId = useId();
  const revealed = 8 + 382 * progress(time, 1.15, 7.75);

  return (
    <section className={styles.epistemics} aria-label="Epistemics">
      <div className={styles.legend}>
        <h3>Epistemics</h3><span>Entropy</span><span className={styles.surprisalLabel}>Surprisal</span>
      </div>
      <svg className={styles.chart} viewBox="0 0 400 87" role="img" aria-label="Captured mean entropy and maximum surprisal, progressively revealed; not factual confidence">
        <title>{epistemicsTrace.provenance.description}</title>
        <defs><clipPath id={clipId}><rect width={revealed} height="87" /></clipPath></defs>
        <path d="M8 18H390M8 46H390M8 76H390" className={styles.chartGrid} />
        <g clipPath={`url(#${clipId})`}>
          {epistemicsTrace.entropy.map((path, index) => <path key={index} d={path} className={styles.entropy} />)}
          {epistemicsTrace.surprisal.map((path, index) => <path key={index} d={path} className={styles.surprisal} />)}
          {epistemicsTrace.toolResultTicks.map(x => <path key={x} d={`M${x} 77V84`} className={styles.toolTick} />)}
        </g>
        <path d={`M${revealed} 7V83`} className={styles.traceHead} opacity={time >= .9 ? 1 : 0} />
      </svg>
      <div className={styles.chartCaption}><span>Captured trace · animated reveal</span><span>Tool results ↓</span></div>
    </section>
  );
}
