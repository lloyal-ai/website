import { useId, useRef } from 'react';
import { useSceneTime, usePlaybackActions, useStageLayout } from '../../playback/ShowpieceContext';
import { ModelMark, Icon, Cursor } from '../../components';
import { progress, ease, lerp } from '../../motion/math';
import TrajectoryPanel from './TrajectoryPanel';
import ContextAdmission from './ContextAdmission';
import { cursorStops } from './inspectData';
import styles from './InspectScene.module.css';

function WindowBar({ inspector }) {
  return <div className={styles.windowBar}>
    <span className={styles.windowDots} aria-hidden="true"><i /><i /><i /></span>
    <span>Your App {inspector && <><span className={styles.separator}>/</span> DevTools</>}</span>
    <span className={styles.barTail}>{inspector ? <><i className={styles.statusDot} />Live inference</> : 'Local workspace'}</span>
  </div>;
}

function ModelRail() {
  const time = useSceneTime();
  return <div className={styles.modelRail} aria-label="Reasoning model, projected input, and independent reranker">
    <div className={styles.railItem}><div className={styles.modelTile}><ModelMark model="qwen" className={styles.modelMark} /><span>Qwen</span></div><p>Reasoning model</p></div>
    <span className={styles.railLine} aria-hidden="true" />
    <div className={styles.railItem}><div className={`${styles.modelTile} ${styles.visionTile}`}><Icon name="projector" size={31} /><span>Vision</span></div><p>Projected input</p></div>
    <div className={styles.railItem}><div className={`${styles.modelTile} ${styles.rerankerTile} ${time >= 10.5 && time < 15 ? styles.activeTile : ''}`}><ModelMark model="qwen" className={styles.modelMark} /><span>Qwen</span><small>Reranker</small></div><p>Own context<br />Batched candidates</p></div>
  </div>;
}

function DemonstrationCursor() {
  const time = useSceneTime();
  const { compact, width } = useStageLayout();
  if (compact || width < 840) return null;
  const index = cursorStops.findIndex((stop, i) => i < cursorStops.length - 1 && time >= stop[0] && time <= cursorStops[i + 1][0]);
  const a = cursorStops[index >= 0 ? index : cursorStops.length - 1];
  const b = cursorStops[index >= 0 ? index + 1 : cursorStops.length - 1];
  const p = ease(progress(time, a[0], Math.max(a[0] + .001, b[0])));
  const pressed = [.9, 6.2, 9.3, 16.1].some(at => Math.abs(time - at) < .18);
  return <Cursor x={lerp(a[1], b[1], p)} y={lerp(a[2], b[2], p)} visible={time <= 17.4} pressed={pressed} className={styles.cursor} />;
}

export default function InspectScene() {
  const time = useSceneTime();
  const { pause, seek } = usePlaybackActions();
  const { compact } = useStageLayout();
  const id = useId();
  const trajectoriesTab = useRef(null);
  const contextTab = useRef(null);
  const tab = time >= 9.3 ? 'context' : 'trajectories';
  const crossfade = ease(progress(time, 9.3, 9.65));
  const selectTab = selected => { pause(); seek(selected === 'context' ? 9.7 : 1.15); };
  const navigateTabs = event => {
    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const selected = key === 'Home' ? 'trajectories' : key === 'End' ? 'context' : tab === 'context' ? 'trajectories' : 'context';
    selectTab(selected);
    (selected === 'context' ? contextTab : trajectoriesTab).current?.focus();
  };

  return <div className={`${styles.scene} ${compact ? styles.compact : ''}`} data-inspect-tab={tab} aria-label="Lloyal DevTools: agent timelines, epistemics, tool calls, and what enters context">
    <ModelRail />
    <section className={styles.app} aria-label="Your App research workspace"><WindowBar /><div className={styles.appBody}>Research brief<small>Finding primary evidence from your documents</small></div></section>
    <section className={styles.inspector} aria-label="Your App developer tools">
      <WindowBar inspector />
      <div className={styles.tabs} role="tablist" aria-label="Inspector views" onKeyDown={navigateTabs}>
        <button ref={trajectoriesTab} id={`${id}-trajectories-tab`} className={styles.tab} role="tab" aria-selected={tab === 'trajectories'} tabIndex={tab === 'trajectories' ? 0 : -1} aria-controls={`${id}-trajectories-panel`} onClick={() => selectTab('trajectories')}>Trajectories</button>
        <button ref={contextTab} id={`${id}-context-tab`} className={styles.tab} role="tab" aria-selected={tab === 'context'} tabIndex={tab === 'context' ? 0 : -1} aria-controls={`${id}-context-panel`} onClick={() => selectTab('context')}>What enters context</button>
        <span className={styles.tabsMeta}>Research 01</span>
      </div>
      <div className={styles.content}>
        <div id={`${id}-trajectories-panel`} className={styles.panel} role="tabpanel" aria-labelledby={`${id}-trajectories-tab`} inert={tab !== 'trajectories'} style={{ opacity: 1 - crossfade, visibility: crossfade >= 1 ? 'hidden' : 'visible' }}><TrajectoryPanel /></div>
        <div id={`${id}-context-panel`} className={styles.panel} role="tabpanel" aria-labelledby={`${id}-context-tab`} inert={tab !== 'context'} style={{ opacity: crossfade, visibility: crossfade > 0 ? 'visible' : 'hidden', transform: `translateY(${7 * (1 - crossfade)}px)` }}><ContextAdmission /></div>
      </div>
      <footer className={styles.footer}><span>{tab === 'context' ? 'Query + original task · focal lens' : 'Generation signals · not factual confidence'}</span><span>{time >= 16.9 ? 'Evidence becomes context' : tab === 'context' ? 'Research 01 / fetch_page' : 'Inspect a running agent'}</span></footer>
    </section>
    <DemonstrationCursor />
  </div>;
}
