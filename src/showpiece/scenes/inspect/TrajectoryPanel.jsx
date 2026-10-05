import { useState } from 'react';
import { useSceneTime, usePlaybackActions, usePlaybackState } from '../../playback/ShowpieceContext';
import { ease, progress } from '../../motion/math';
import AgentTimelines from './AgentTimelines';
import EpistemicsChart from './EpistemicsChart';
import { actions } from './inspectData';
import styles from './InspectScene.module.css';

export default function TrajectoryPanel() {
  const time = useSceneTime();
  const { pause, seek } = usePlaybackActions();
  const { playing } = usePlaybackState();
  const [selection, setSelection] = useState(null);
  const explicitSelection = !playing && selection && Math.abs(time - selection.at) < .04 ? selection.id : null;
  const activeAction = explicitSelection || (time >= 6.2 ? 'fetch_page' : null);
  const selectAction = action => {
    if (action.inspectAt === null) return;
    pause();
    seek(action.inspectAt);
    setSelection({ id: action.id, at: action.inspectAt });
  };

  return (
    <div className={styles.trajectory}>
      <AgentTimelines />
      <section className={styles.detail} style={{ opacity: .35 + .65 * ease(progress(time, .9, 1.2)) }} aria-label="Research 01 details">
        <div className={styles.detailTitle}><h3>Research 01</h3><span>Selected agent</span></div>
        <EpistemicsChart />
        <h4 className={styles.actionsHeading}>Actions</h4>
        <div className={styles.actions}>
          {actions.map(action => <button
            key={action.id}
            data-inspect-target={action.id === 'fetch_page' ? 'fetch' : undefined}
            className={`${styles.action} ${activeAction === action.id ? styles.selectedAction : ''}`}
            onClick={() => selectAction(action)}
            disabled={action.inspectAt === null}
            aria-pressed={activeAction === action.id}
            style={{ opacity: activeAction === action.id ? 1 : .35 + .65 * ease(progress(time, action.at, action.at + .5)) }}
          ><span className={styles.actionSymbol}>{action.symbol}</span><code>{action.id}</code><span className={styles.actionDescription}>{action.label}</span></button>)}
        </div>
        <div className={styles.actionDetails}>
          {activeAction === 'fetch_page' ? <><span><strong>fetch_page result</strong> · 5 passages</span><button onClick={() => { pause(); seek(9.7); }}>Inspect context →</button></>
            : activeAction === 'web_search' ? <span><strong>web_search</strong> · Market outlook</span>
              : <span>Select a call to inspect its result.</span>}
        </div>
      </section>
    </div>
  );
}
