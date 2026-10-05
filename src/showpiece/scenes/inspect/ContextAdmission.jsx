import { useSceneTime, usePlaybackActions } from '../../playback/ShowpieceContext';
import { progress, ease, lerp } from '../../motion/math';
import { passages, rankedPassageIds } from './inspectData';
import styles from './InspectScene.module.css';

function RankConnections({ rank, highlighted, time }) {
  return <svg className={styles.rankConnections} viewBox="0 0 229 168" preserveAspectRatio="none" aria-hidden="true">
    {passages.map((passage, index) => {
      const target = rankedPassageIds.indexOf(passage.id);
      const from = index * 35 + 14;
      const to = lerp(index, target, rank) * 35 + 14;
      const bright = highlighted && passage.id === '05';
      const p = progress(time, 12.1, 14.6);
      const u = 1 - p;
      const token = bright && time >= 12.1 && time < 14.6;
      return <g key={passage.id} className={bright ? styles.brightConnection : styles.connection}>
        <path d={`M3 ${from}C78 ${from} 151 ${to} 225 ${to}`} />
        <circle cx="3" cy={from} r={bright ? 2.9 : 2} />
        <circle cx="225" cy={to} r={bright ? 2.9 : 2} />
        {token && <circle className={styles.rankToken}
          cx={3 * u ** 3 + 3 * 78 * u ** 2 * p + 3 * 151 * u * p ** 2 + 225 * p ** 3}
          cy={from * u ** 3 + 3 * from * u ** 2 * p + 3 * to * u * p ** 2 + to * p ** 3}
          r="3.5" />}
      </g>;
    })}
  </svg>;
}

function PassageColumn({ reranked, rank, highlighted, onAdmit }) {
  return <div className={styles.passageColumn} aria-label={reranked ? 'Reranked passages' : 'Retrieved passages'}>
    {passages.map((passage, index) => {
      const target = rankedPassageIds.indexOf(passage.id);
      const position = reranked ? lerp(index, target, rank) : index;
      const displayRank = reranked && rank >= .5 ? target + 1 : index + 1;
      const focused = highlighted && passage.id === '05';
      const className = `${styles.passage} ${focused ? styles.focusedPassage : ''}`;
      const style = { transform: `translateY(${position * 35}px)` };
      const content = <><span className={styles.passageNumber}>{String(displayRank).padStart(2, '0')}</span><span>{passage.label}</span></>;
      return reranked && passage.id === '05'
        ? <button key={passage.id} className={className} style={style} onClick={onAdmit} disabled={rank < 1} aria-label="Admit source 05, Primary evidence, to Research 01">{content}</button>
        : <div key={passage.id} className={className} style={style} data-source-id={passage.id}>{content}</div>;
    })}
  </div>;
}

export default function ContextAdmission() {
  const time = useSceneTime();
  const { pause, seek } = usePlaybackActions();
  const rank = ease(progress(time, 12.1, 14.6));
  const admitted = time > 16.1;
  const highlighted = time >= 11.8;
  const admit = () => { pause(); seek(16.9); };

  return <section className={styles.contextAdmission} aria-label="What enters context">
    <div className={styles.contextTitle}><h3>What the agent receives</h3><span>fetch_page · Research 01</span></div>
    <div className={styles.lenses}>
      <span className={`${styles.lens} ${time >= 10.3 ? styles.activeLens : ''}`}>Tool query <strong>Market outlook</strong></span>
      <span className={`${styles.lens} ${time >= 11.4 ? styles.activeLens : ''}`}>Original task <strong>Find primary evidence</strong></span>
    </div>
    <div className={styles.rankHeadings}><span>Retrieved</span><span>Reranked with focal lens</span></div>
    <div className={styles.ranking}>
      <PassageColumn rank={rank} highlighted={highlighted} />
      <RankConnections rank={rank} highlighted={highlighted} time={time} />
      <PassageColumn reranked rank={rank} highlighted={highlighted} onAdmit={admit} />
    </div>
    <div className={`${styles.admission} ${admitted ? styles.admitted : ''}`}>
      <span aria-hidden="true">↳</span>
      <span>{admitted ? <><strong>Primary evidence</strong> admitted to Research 01</> : time >= 14.6 ? 'Source 05 → rank 01 · identity preserved' : 'Comparing the same five passages'}</span>
      <span className={styles.admissionTail}>{admitted ? 'Research 02 unchanged' : 'Agent-local admission'}</span>
    </div>
  </section>;
}
