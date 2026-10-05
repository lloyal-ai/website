import { useSceneTime, usePlaybackActions } from '../../playback/ShowpieceContext';
import { Icon } from '../../components';
import { actions, timelineDuration } from './inspectData';
import { elapsedAt, getTimelineFrame } from './timelineFrame';
import styles from './InspectScene.module.css';

const percent = value => `${value / timelineDuration * 100}%`;
const ticks = [0, 30, 60, 90];

export default function AgentTimelines() {
  const time = useSceneTime();
  const { pause, seek } = usePlaybackActions();
  const frame = getTimelineFrame(time);
  const selectResearch = () => { pause(); seek(1.15); };

  return (
    <section className={styles.agents} aria-label="Agent timelines">
      <div className={styles.agentsHeader}><h3>Agent timelines</h3><span>Elapsed time</span></div>
      <div className={styles.timeAxis} aria-hidden="true">
        {ticks.map(tick => <span key={tick} style={{ left: percent(tick) }}>{tick}s</span>)}
      </div>
      <div className={styles.agentRows}>
        <svg className={styles.lineageGraph} viewBox="0 0 90 5" preserveAspectRatio="none" aria-hidden="true">
          {ticks.map(tick => <path key={tick} d={`M${tick} 0V5`} className={styles.timeGrid} />)}
          {frame.lanes.filter(agent => agent.parent && agent.visible).map(agent => {
            const parent = frame.lanes.findIndex(lane => lane.id === agent.parent);
            const row = frame.lanes.indexOf(agent);
            return <path key={agent.id} className={styles.forkLine} d={`M${agent.start} ${parent + .5}V${row + .5}h2`} />;
          })}
          <path className={styles.playhead} d={`M${frame.now} 0V5`} />
        </svg>
        {frame.lanes.map(agent => {
          const selected = agent.id === '01' && time >= .9;
          const className = [styles.agentRow, selected && styles.selectedAgent, agent.id === 'root' && styles.sharedRoot].filter(Boolean).join(' ');
          const content = <>
            <span className={styles.agentLabel}>{agent.name}</span>
            <span className={styles.timeline}>
              <span className={styles.generationSpan} style={{ left: percent(agent.start), width: percent(agent.duration) }} />
              {agent.id === '01' && actions.filter(action => action.inspectAt !== null && time >= action.at).map(action =>
                <span key={action.id} className={styles.eventMark} style={{ left: percent(elapsedAt(action.at)) }} title={action.id}>
                  <Icon name={action.id === 'web_search' ? 'search' : 'document'} size={10} />
                </span>)}
            </span>
          </>;
          return agent.id === '01'
            ? <button key={agent.id} data-inspect-target="agent" className={className} onClick={selectResearch} aria-pressed={selected} aria-label="Inspect Research 01">{content}</button>
            : <div key={agent.id} className={className} style={{ opacity: agent.visible ? 1 : .35 }}>{content}</div>;
        })}
      </div>
      <p className={styles.agentsFoot}>Illustrated run · one resident model</p>
    </section>
  );
}
