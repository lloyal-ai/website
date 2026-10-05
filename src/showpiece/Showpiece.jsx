import { useEffect, useMemo, useRef, useState } from 'react';
import { SCENES, sceneById } from './config.js';
import { Icon } from './components';
import { StageLayoutContext } from './playback/contexts.js';
import { usePlaybackActions, usePlaybackState, useSceneTime } from './playback/ShowpieceContext.js';
import ComposeScene from './scenes/compose/ComposeScene.jsx';
import LiveInferenceScene from './scenes/live/LiveInferenceScene.jsx';
import InspectScene from './scenes/inspect/InspectScene.jsx';
import { ShipScene, LaunchScene } from './scenes/delivery/DeliveryScenes.jsx';
import styles from './Showpiece.module.css';

const sceneComponents = { compose: ComposeScene, live: LiveInferenceScene, inspect: InspectScene, ship: ShipScene, launch: LaunchScene };

function ProgressMark() {
  const time = useSceneTime();
  const { sceneId } = usePlaybackState();
  return <span className={styles.progressFill} style={{ transform: `scaleX(${time / sceneById(sceneId).duration})` }}/>;
}

function SceneNavigation() {
  const { sceneId, playing, reducedMotion } = usePlaybackState();
  const { selectScene, play, pause, restart } = usePlaybackActions();
  const buttons = useRef([]);
  const tablist = useRef(null);
  useEffect(() => {
    const selected = buttons.current[SCENES.findIndex((scene) => scene.id === sceneId)];
    const list = tablist.current;
    if (!selected || !list) return;
    const item = selected.getBoundingClientRect();
    const viewport = list.getBoundingClientRect();
    const offset = item.left < viewport.left ? item.left - viewport.left - 4 : item.right > viewport.right ? item.right - viewport.right + 4 : 0;
    if (offset) list.scrollTo({ left: list.scrollLeft + offset, behavior: reducedMotion ? 'instant' : 'smooth' });
  }, [sceneId, reducedMotion]);
  function navigate(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % SCENES.length;
    else if (event.key === 'ArrowLeft') next = (index + SCENES.length - 1) % SCENES.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = SCENES.length - 1;
    else return;
    event.preventDefault();
    selectScene(SCENES[next].id);
    buttons.current[next]?.focus();
  }
  return <div className={styles.navigation}>
    <div className={styles.tabs} ref={tablist} role="tablist" aria-label="Explore the platform">
      {SCENES.map((scene, index) => <button key={scene.id} ref={(node) => { buttons.current[index] = node; }} type="button" role="tab" id={`sp-tab-${scene.id}`} aria-controls={`sp-panel-${scene.id}`} aria-selected={sceneId === scene.id} tabIndex={sceneId === scene.id ? 0 : -1} className={styles.tab} onClick={() => selectScene(scene.id)} onKeyDown={(event) => navigate(event, index)}>
        <span className={styles.pageMark} aria-hidden="true">{sceneId === scene.id && <ProgressMark/>}</span><span>{scene.label}</span>
      </button>)}
    </div>
    <div className={styles.playback}>
      {!reducedMotion && <button onClick={playing ? pause : play} aria-label={playing ? 'Pause showpiece' : 'Play showpiece'} title={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} size={13}/></button>}
      {!reducedMotion && <button onClick={restart} aria-label="Replay this scene" title="Replay"><svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 7a6 6 0 1 1-.2 6M3 3v5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
    </div>
  </div>;
}

function SceneStage() {
  const { sceneId, running } = usePlaybackState();
  const { pause } = usePlaybackActions();
  const scene = sceneById(sceneId);
  const Scene = sceneComponents[sceneId];
  const measureRef = useRef(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(measureRef.current);
    return () => observer.disconnect();
  }, []);
  const layout = useMemo(() => ({ width, compact: width < 700 }), [width]);
  return <div className={styles.visual} ref={measureRef} data-running={running} onFocusCapture={(event) => { if (event.target.matches(':focus-visible')) pause(); }}>
    <StageLayoutContext value={layout}>
      <div className={styles.stage} style={{ minHeight: layout.compact ? 840 : 610 }} id={`sp-panel-${sceneId}`} role="tabpanel" aria-labelledby={`sp-tab-${sceneId}`} tabIndex={0} key={sceneId} data-scene={sceneId}>
        <p className={styles.srOnly}>{scene.description}</p><Scene/>
      </div>
    </StageLayoutContext>
    <SceneNavigation/>
    <div className={styles.sceneCaption}><span className={styles.counter}>{String(SCENES.indexOf(scene) + 1).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')}</span><p>{scene.title}</p></div>
  </div>;
}

export default function Showpiece() {
  return <div className={styles.root}><SceneStage/></div>;
}
