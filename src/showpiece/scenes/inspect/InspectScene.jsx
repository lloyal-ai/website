import { useEffect, useId, useRef, useState } from 'react';
import { useSceneTime, usePlaybackActions, useStageLayout } from '../../playback/ShowpieceContext';
import { ModelMark, Icon, Cursor, DocsLink, NetworkIndicator, WindowChrome } from '../../components';
import { progress, ease, lerp } from '../../motion/math';
import TrajectoryPanel from './TrajectoryPanel';
import ContextAdmission from './ContextAdmission';
import { RERANK_END } from './rerankFrame';
import styles from './InspectScene.module.css';

function LiveStatusDot() {
  const time = useSceneTime();
  const pulse = .5 + .5 * Math.sin(time * Math.PI);
  return <i className={styles.statusDot} aria-hidden="true" style={{ opacity: .65 + .35 * pulse, boxShadow: `0 0 0 ${1 + 2 * pulse}px color-mix(in srgb, var(--sp-success) 12%, transparent)` }} />;
}

function WindowBar({ inspector }) {
  return <WindowChrome
    className={styles.windowBar}
    align="start"
    title={<>Your App {inspector && <><span className={styles.separator}>/</span> <DocsLink href="https://docs.lloyal.ai/traces">DevTools</DocsLink></>}</>}
    actions={<span className={styles.barTail}>{inspector ? <><LiveStatusDot />Live inference</> : <NetworkIndicator connection="offline" />}</span>}
  />;
}

function ModelRail() {
  const time = useSceneTime();
  return <div className={styles.modelRail} aria-label="Reasoning model, projected input, and independent reranker with its own context and batched candidate scoring">
    <div className={styles.railItem}><div className={styles.modelTile}><ModelMark model="qwen" className={styles.modelMark} /><span>Qwen</span></div><p>Reasoning model</p></div>
    <span className={styles.railLine} aria-hidden="true" />
    <div className={styles.railItem}><div className={`${styles.modelTile} ${styles.visionTile}`}><Icon name="projector" size={31} /><span>Vision</span></div><p>Projected input</p></div>
    <div className={styles.railItem}><div className={`${styles.modelTile} ${styles.rerankerTile} ${time >= 10.5 && time < 15 ? styles.activeTile : ''}`}><ModelMark model="qwen" className={styles.modelMark} /><span>Qwen</span><small>Reranker</small></div><p>Own context<br />Batch scoring</p></div>
  </div>;
}

const cursorCues = [
  { at: 0, target: 'agent', dx: 28, dy: 70 },
  { at: .5, target: 'agent' }, { at: .9, target: 'agent' },
  { at: 1.4, target: 'agent', dx: 30, dy: 25 },
  { at: 5.6, target: 'fetch' }, { at: 6.2, target: 'fetch' },
  { at: 7.3, target: 'fetch', dx: 40, dy: 30 },
  { at: 8.7, target: 'context' }, { at: 9.3, target: 'context' },
  { at: 10, target: 'context', dx: 120, dy: 60 },
  { at: 14.9, target: 'context', dx: 120, dy: 60 },
  { at: 15.6, target: 'passage' }, { at: 16.1, target: 'passage' },
  { at: 17, target: 'passage', dx: 32, dy: 42 },
];

function useCursorTargets(sceneRef, enabled, layoutPhase) {
  const [targets, setTargets] = useState({});

  // This hook lives below the scene host. Wait until the full commit has
  // attached that parent ref before registering the initial measurement.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!enabled || !scene) return;
    const controls = [...scene.querySelectorAll('[data-inspect-target]')];
    const measure = () => {
      const bounds = scene.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      // The homepage scales the desktop stage. Convert viewport geometry back
      // into the scene's own CSS pixels before positioning the cursor tip.
      const scaleX = scene.clientWidth / bounds.width;
      const scaleY = scene.clientHeight / bounds.height;
      const next = Object.fromEntries(controls.map(control => {
        const rect = control.getBoundingClientRect();
        return [control.dataset.inspectTarget, {
          x: (rect.left + rect.width / 2 - bounds.left) * scaleX - 2,
          y: (rect.top + rect.height / 2 - bounds.top) * scaleY - 2,
        }];
      }));
      setTargets(previous => Object.entries(next).every(([key, point]) =>
        previous[key]?.x === point.x && previous[key]?.y === point.y,
      ) ? previous : next);
    };
    // Initial observation also measures after this commit; phase changes
    // refresh transformed rows once their choreography reaches a settled state.
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    controls.forEach(control => observer.observe(control));
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [sceneRef, enabled, layoutPhase]);

  return targets;
}

function DemonstrationCursor({ sceneRef }) {
  const time = useSceneTime();
  const { compact, width } = useStageLayout();
  const enabled = !compact && width >= 840;
  const layoutPhase = time >= RERANK_END ? 'ranked' : time >= 9.65 ? 'context' : 'trajectories';
  const targets = useCursorTargets(sceneRef, enabled, layoutPhase);
  if (!enabled) return null;
  const index = cursorCues.findIndex((cue, i) => i < cursorCues.length - 1 && time >= cue.at && time <= cursorCues[i + 1].at);
  const a = cursorCues[index >= 0 ? index : cursorCues.length - 1];
  const b = cursorCues[index >= 0 ? index + 1 : cursorCues.length - 1];
  if (!targets[a.target] || !targets[b.target]) return null;
  const p = ease(progress(time, a.at, Math.max(a.at + .001, b.at)));
  const position = cue => ({ x: targets[cue.target].x + (cue.dx ?? 0), y: targets[cue.target].y + (cue.dy ?? 0) });
  const from = position(a);
  const to = position(b);
  const pressed = [.9, 6.2, 9.3, 16.1].some(at => Math.abs(time - at) < .18);
  return <Cursor x={lerp(from.x, to.x, p)} y={lerp(from.y, to.y, p)} visible={time <= 17.4} pressed={pressed} className={styles.cursor} />;
}

export default function InspectScene() {
  const time = useSceneTime();
  const { pause, seek } = usePlaybackActions();
  const { compact } = useStageLayout();
  const id = useId();
  const sceneRef = useRef(null);
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

  return <div ref={sceneRef} className={`${styles.scene} ${compact ? styles.compact : ''}`} data-inspect-tab={tab} aria-label="Lloyal DevTools: agent timelines, epistemics, tool calls, and what enters context">
    <ModelRail />
    <section className={styles.app} aria-label="Your App research workspace"><WindowBar /><div className={styles.appBody}>Research brief<small>Finding primary evidence from your documents</small></div></section>
    <section className={styles.inspector} aria-label="Your App developer tools">
      <WindowBar inspector />
      <div className={styles.tabs} role="tablist" aria-label="Inspector views" onKeyDown={navigateTabs}>
        <button ref={trajectoriesTab} id={`${id}-trajectories-tab`} className={styles.tab} role="tab" aria-selected={tab === 'trajectories'} tabIndex={tab === 'trajectories' ? 0 : -1} aria-controls={`${id}-trajectories-panel`} onClick={() => selectTab('trajectories')}>Trajectories</button>
        <button ref={contextTab} id={`${id}-context-tab`} className={styles.tab} data-inspect-target="context" role="tab" aria-selected={tab === 'context'} tabIndex={tab === 'context' ? 0 : -1} aria-controls={`${id}-context-panel`} onClick={() => selectTab('context')}>What enters context</button>
        <span className={styles.tabsMeta}>Research 01</span>
      </div>
      <div className={styles.content}>
        <div id={`${id}-trajectories-panel`} className={styles.panel} role="tabpanel" aria-labelledby={`${id}-trajectories-tab`} inert={tab !== 'trajectories'} style={{ opacity: 1 - crossfade, visibility: crossfade >= 1 ? 'hidden' : 'visible' }}><TrajectoryPanel /></div>
        <div id={`${id}-context-panel`} className={styles.panel} role="tabpanel" aria-labelledby={`${id}-context-tab`} inert={tab !== 'context'} style={{ opacity: crossfade, visibility: crossfade > 0 ? 'visible' : 'hidden', transform: `translateY(${7 * (1 - crossfade)}px)` }}><ContextAdmission /></div>
      </div>
      <footer className={styles.footer}><span>{tab === 'context' ? 'Query + original task · focal lens' : 'Generation signals · not factual confidence'}</span><span>{time >= 16.9 ? 'Evidence becomes context' : tab === 'context' ? 'Research 01 / fetch_page' : 'Inspect a running agent'}</span></footer>
    </section>
    <DemonstrationCursor sceneRef={sceneRef} />
  </div>;
}
