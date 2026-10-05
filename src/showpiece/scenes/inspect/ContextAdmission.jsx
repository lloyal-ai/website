import { useLayoutEffect, useRef, useState } from 'react';
import { useSceneTime, usePlaybackActions, useStageLayout } from '../../playback/ShowpieceContext';
import { passages } from './inspectData';
import { getRerankFrame, RERANK_END } from './rerankFrame';
import styles from './InspectScene.module.css';

function RankConnections({ frame, highlighted, rowSpacing, cardHeight }) {
  const element = useRef(null);
  const [width, setWidth] = useState(229);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);

  // Pixel coordinates keep the connectors attached during an 8px lift on both
  // the 44px mobile gutter and the expansive desktop gutter.
  return <svg ref={element} className={styles.rankConnections} aria-hidden="true">
    {passages.map((passage, index) => {
      const row = frame.rows[index];
      const from = index * rowSpacing + cardHeight / 2;
      const to = row.position * rowSpacing + cardHeight / 2;
      const end = width + row.x;
      const c1 = width * .34;
      const c2 = end - width * .34;
      const bright = highlighted && passage.id === '05';
      const p = frame.token;
      const u = 1 - p;
      const token = bright && row.moving;
      return <g key={passage.id} className={bright ? styles.brightConnection : styles.connection}>
        <path d={`M0 ${from}C${c1} ${from} ${c2} ${to} ${end} ${to}`} />
        <circle cx="0" cy={from} r={bright ? 2.2 : 1.7} />
        <circle cx={end} cy={to} r={bright ? 2.2 : 1.7} />
        {token && <circle className={styles.rankToken}
          cx={3 * c1 * u ** 2 * p + 3 * c2 * u * p ** 2 + end * p ** 3}
          cy={from * u ** 3 + 3 * from * u ** 2 * p + 3 * to * u * p ** 2 + to * p ** 3}
          r="2.6" />}
      </g>;
    })}
  </svg>;
}

function PassageColumn({ reranked, frame, highlighted, rowSpacing, onAdmit }) {
  return <div className={styles.passageColumn} aria-label={reranked ? 'Reranked passages' : 'Retrieved passages'}>
    {passages.map((passage, index) => {
      const row = frame.rows[index];
      const position = reranked ? row.position : index;
      const displayRank = reranked ? row.rank : index + 1;
      const focused = highlighted && passage.id === '05';
      const className = `${styles.passage} ${focused ? styles.focusedPassage : ''}`;
      const style = {
        transform: `translate(${reranked ? row.x : 0}px, ${position * rowSpacing}px)`,
        zIndex: reranked && row.moving ? 3 : focused ? 2 : 1,
        boxShadow: reranked && row.lift > 0 ? `0 ${2 * row.lift}px ${12 * row.lift}px #00000070` : undefined,
      };
      const content = <><span className={styles.passageNumber}>{String(displayRank).padStart(2, '0')}</span><span className={styles.passageLabel}>{passage.label}</span></>;
      return reranked && passage.id === '05'
        ? <button key={passage.id} className={className} style={style} data-source-id={passage.id} data-inspect-target="passage" title={passage.label} onClick={onAdmit} disabled={!frame.complete} aria-label="Admit source 05, Primary evidence, to Research 01">{content}</button>
        : <div key={passage.id} className={className} style={style} data-source-id={passage.id} title={`Source ${passage.id}: ${passage.label}`}>{content}</div>;
    })}
  </div>;
}

export default function ContextAdmission() {
  const time = useSceneTime();
  const { pause, seek } = usePlaybackActions();
  const { compact } = useStageLayout();
  const rowSpacing = compact ? 43 : 35;
  const cardHeight = compact ? 36 : 28;
  const frame = getRerankFrame(time);
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
      <PassageColumn frame={frame} highlighted={highlighted} rowSpacing={rowSpacing} />
      <RankConnections frame={frame} highlighted={highlighted} rowSpacing={rowSpacing} cardHeight={cardHeight} />
      <PassageColumn reranked frame={frame} highlighted={highlighted} rowSpacing={rowSpacing} onAdmit={admit} />
    </div>
    <div className={`${styles.admission} ${admitted ? styles.admitted : ''}`}>
      <span aria-hidden="true">↳</span>
      <span>{admitted ? <><strong>Primary evidence</strong> admitted to Research 01</> : time >= RERANK_END ? 'Source 05 → rank 01 · identity preserved' : 'Comparing the same five passages'}</span>
      <span className={styles.admissionTail}>{admitted ? 'Research 02 unchanged' : 'Agent-local admission'}</span>
    </div>
  </section>;
}
