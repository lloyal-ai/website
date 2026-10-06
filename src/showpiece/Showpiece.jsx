import { useEffect, useMemo, useRef, useState } from 'react';
import { sceneById } from './config.js';
import { StageLayoutContext } from './playback/contexts.js';
import { usePlaybackActions, usePlaybackState } from './playback/ShowpieceContext.js';
import SceneNavigation from './SceneNavigation.jsx';
import ComposeScene from './scenes/compose/ComposeScene.jsx';
import LiveInferenceScene from './scenes/live/LiveInferenceScene.jsx';
import InspectScene from './scenes/inspect/InspectScene.jsx';
import { ShipScene, LaunchScene } from './scenes/delivery/DeliveryScenes.jsx';
import styles from './Showpiece.module.css';

const sceneComponents = { compose: ComposeScene, live: LiveInferenceScene, inspect: InspectScene, ship: ShipScene, launch: LaunchScene };

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
      <div className={styles.stage} data-compact={layout.compact} id={`sp-panel-${sceneId}`} role="tabpanel" aria-labelledby={`sp-tab-${sceneId}`} tabIndex={0} key={sceneId} data-scene={sceneId}>
        <p className={styles.srOnly}>{scene.description}</p><Scene/>
      </div>
    </StageLayoutContext>
    <SceneNavigation/>
  </div>;
}

export default function Showpiece() {
  return <div className={styles.root}><SceneStage/></div>;
}
