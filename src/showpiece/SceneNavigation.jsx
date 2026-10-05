import { useRef } from 'react';
import { SCENES, sceneById } from './config.js';
import { Icon } from './components';
import { usePlaybackActions, usePlaybackState, useSceneTime } from './playback/ShowpieceContext.js';
import styles from './SceneNavigation.module.css';

function StepProgress({ duration }) {
  const time = useSceneTime();
  return <svg className={styles.progressRing} viewBox="0 0 40 40" aria-hidden="true">
    <circle className={styles.progressTrack} cx="20" cy="20" r="18" />
    <circle className={styles.progressFill} cx="20" cy="20" r="18" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.min(time / duration, 1)} transform="rotate(-90 20 20)" />
  </svg>;
}

/** A freely navigable product journey; each step keeps its existing tab semantics. */
export default function SceneNavigation() {
  const { sceneId, playing, reducedMotion } = usePlaybackState();
  const { selectScene, play, pause, restart } = usePlaybackActions();
  const buttons = useRef([]);

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
    <div className={styles.tabs} role="tablist" aria-label="Explore the platform">
      {SCENES.map((scene, index) => <div className={styles.step} key={scene.id} role="presentation">
        <button ref={(node) => { buttons.current[index] = node; }} type="button" role="tab" id={`sp-tab-${scene.id}`} aria-controls={`sp-panel-${scene.id}`} aria-selected={sceneId === scene.id} tabIndex={sceneId === scene.id ? 0 : -1} className={styles.tab} onClick={() => selectScene(scene.id)} onKeyDown={(event) => navigate(event, index)}>
          <span className={styles.number} aria-hidden="true">{index + 1}{sceneId === scene.id && !reducedMotion && <StepProgress duration={scene.duration} />}</span>
          <span className={styles.label}>{scene.label}</span>
        </button>
        {index < SCENES.length - 1 && <svg className={styles.connector} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>)}
    </div>
    <div className={styles.details}>
      <p className={styles.caption}>{sceneById(sceneId).title}</p>
      {!reducedMotion && <div className={styles.playback} role="group" aria-label="Showpiece playback">
        <button type="button" onClick={playing ? pause : play} aria-label={playing ? 'Pause showpiece' : 'Play showpiece'} title={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} size={16}/></button>
        <button type="button" onClick={restart} aria-label="Replay this scene" title="Replay"><svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 7a6 6 0 1 1-.2 6M3 3v5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
      </div>}
    </div>
  </div>;
}
