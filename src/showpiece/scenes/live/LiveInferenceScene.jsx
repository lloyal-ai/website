import { useReducer } from 'react';
import { useSceneTime, usePlaybackActions, usePlaybackState, useStageLayout } from '../../playback/ShowpieceContext';
import { AppWindow, Cursor, Icon, ModelTile } from '../../components';
import { ease, lerp, progress } from '../../motion/math';
import LineageTree from './LineageTree';
import { getLiveFrame, initialInteraction, liveInteractionReducer } from './liveFrame';
import styles from './LiveInferenceScene.module.css';

function ModelOwner({ compact }) {
  return <div className={styles.owner}>
    <ModelTile model="qwen" label={compact ? undefined : 'Qwen'} role={compact ? undefined : 'Reasoning model'} small={compact} className={styles.model} />
    {compact && <div className={styles.compactModelLabel}><strong>Qwen</strong><span>Reasoning model</span></div>}
    <span className={styles.projector} aria-label="Vision projector"><Icon name="projector" size={18} /></span>
    <span className={styles.ownerRoute} aria-hidden="true" />
    <p className={styles.ownerStatus}><strong>One resident model</strong><span>Fork · inherit · continue</span></p>
  </div>;
}

function RunControls({ frame, onPauseToggle, onCancel }) {
  return <div className={styles.actionBar}>
    <span className={styles.selected}>Selected <b>{frame.selectedAgent}</b></span>
    <div className={styles.actions}>
      <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onPauseToggle} aria-label={frame.paused ? 'Resume live inference' : 'Pause live inference'} aria-pressed={frame.paused}>
        <Icon name={frame.paused ? 'play' : 'pause'} size={11} /><span>{frame.paused ? 'Resume run' : 'Pause run'}</span>
      </button>
      <button type="button" className={`${styles.button} ${styles.cancel}`} data-cancelled={frame.cancelled} onClick={onCancel} disabled={!frame.cancelAvailable} aria-label="Cancel Research 01b" title={!frame.childExists ? 'Available when Research 01b has forked.' : frame.cancelled ? 'Cancelled; its history remains inspectable.' : 'Cancel Research 01b'}>
        <Icon name="close" size={11} /><span>{frame.cancelled ? 'Cancelled' : 'Cancel agent'}</span>
      </button>
    </div>
  </div>;
}

function WarmComposer({ projected }) {
  return <div className={styles.composer} aria-label="Your App composer">
    <div className={styles.composerEntry}><Icon name="attachment" size={14} /><span>{projected ? 'Ask about this brief — the context is still warm…' : 'Compare this image with the source notes.'}</span></div>
    <div className={styles.abilities}>{['documents', 'vision', 'corpus'].map(ability => <span key={ability} className={styles.ability}>{ability}</span>)}</div>
    <span className={styles.send} aria-hidden="true"><Icon name="arrow" size={13} /></span>
  </div>;
}

function AuthoredCursor({ frame, width, compact }) {
  const pauseX = width - (compact ? 185 : 202);
  const cancelX = width - (compact ? 78 : 101);
  const actionY = compact ? 581 : 470;
  const outside = [width + 20, compact ? 697 : 594];
  const stops = [
    [0, ...outside], [12.7, ...outside], [13.85, pauseX, actionY],
    [14.3, pauseX, actionY], [15.1, cancelX, actionY], [16.6, cancelX, actionY],
    [17.55, pauseX, actionY], [18.25, pauseX, actionY], [18.9, ...outside], [21.5, ...outside],
  ];
  const stopIndex = stops.findIndex(stop => stop[0] >= frame.time);
  const next = stops[Math.max(1, stopIndex)];
  const previous = stops[Math.max(0, stopIndex - 1)];
  const amount = ease(progress(frame.time, previous[0], next[0]));
  const pressed = [[14.15, 14.35], [16.4, 16.62], [18, 18.22]].some(([start, end]) => frame.time >= start && frame.time < end);
  return <Cursor x={lerp(previous[1], next[1], amount)} y={lerp(previous[2], next[2], amount)} visible={!frame.manual && frame.time >= 12.8 && frame.time < 18.8} pressed={pressed} />;
}

export default function LiveInferenceScene() {
  const time = useSceneTime();
  const { pause, play } = usePlaybackActions();
  const playback = usePlaybackState();
  const { compact, width } = useStageLayout();
  const [interaction, dispatch] = useReducer(liveInteractionReducer, initialInteraction);
  const frame = getLiveFrame(time, interaction, playback);

  function control({ paused = frame.paused, cancelled = frame.cancelled, resumed = frame.resumed }) {
    dispatch({
      type: 'control', revision: playback.revision, time: frame.time,
      activeTime: frame.activeTime, paused, cancelled, resumed,
    });
  }

  function togglePause() {
    const resume = frame.paused;
    control({ paused: !resume, resumed: frame.resumed || resume });
    if (resume) play();
    else pause();
  }

  function cancelAgent() {
    if (!frame.cancelAvailable) return;
    control({ cancelled: true });
    // An authored pause is an interval on the presentation clock. Direct
    // manipulation turns it into a real pause at this exact current frame.
    if (frame.paused) pause();
  }

  return <div className={`${styles.scene} ${compact ? styles.compact : ''}`} data-scene="live" data-inference-paused={frame.paused} data-agent-cancelled={frame.cancelled} data-manual-control={frame.manual}>
    <ModelOwner compact={compact} />
    <AppWindow title="Your App" offline className={styles.app}>
      <div className={styles.appContent}>
        <header className={styles.heading}>
          <h3>Research brief</h3>
          <p>A shared starting point. Independent continuations.</p>
          <span className={styles.runState} data-state={frame.paused ? 'paused' : time < 3.5 ? 'preparing' : 'live'}>{frame.runState}</span>
        </header>
        <section className={styles.panel} aria-label="Shared attention state">
          <div className={styles.panelHeading}><h4>Shared attention state</h4><span className={styles.panelState} data-state={frame.paused ? 'paused' : time < 3.5 ? 'preparing' : 'live'}><i />{frame.panelState}</span></div>
          <LineageTree frame={frame} compact={compact} />
          <p className={styles.footnote}><strong>{frame.footnote[0]}</strong> {frame.footnote[1]}</p>
          {frame.cancelled && <span className={styles.history}>History retained</span>}
        </section>
        <RunControls frame={frame} onPauseToggle={togglePause} onCancel={cancelAgent} />
        <WarmComposer projected={time >= 2.3} />
      </div>
    </AppWindow>
    <AuthoredCursor frame={frame} width={width} compact={compact} />
    <p className={styles.caption}><b>liblloyal</b><span aria-hidden="true">·</span>GPU-native agents from live KV state.</p>
  </div>;
}
