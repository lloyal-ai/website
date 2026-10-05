import { useSceneTime, usePlaybackActions } from '../../playback/ShowpieceContext';
import { progress, ease, lerp } from '../../motion/math';
import { agents } from './inspectData';
import styles from './InspectScene.module.css';

export default function AgentTimelines() {
  const time = useSceneTime();
  const { pause, seek } = usePlaybackActions();
  const selectResearch = () => { pause(); seek(1.15); };

  return (
    <section className={styles.agents} aria-label="Agent timelines">
      <div className={styles.agentsHeader}><h3>Agent timelines</h3><span>generation →</span></div>
      <div className={styles.agentRows}>
        {agents.map((agent, index) => {
          const selected = agent.id === '01' && time >= .9;
          const width = lerp(agent.from, agent.to, ease(progress(time, 1, index < 3 ? 8 : 7)));
          const className = [styles.agentRow, selected && styles.selectedAgent, agent.child && styles.childAgent, index === 0 && styles.sharedRoot].filter(Boolean).join(' ');
          const content = <>
            <span className={styles.agentLabel}>{agent.name}</span>
            <span className={styles.timeline}>
              <span className={styles.generationSpan} style={{ left: `${agent.start / 123 * 100}%`, width: `${width / 123 * 100}%` }} />
              {index > 0 && <i className={styles.tokenHead} style={{ left: `${(agent.start + width - 3) / 123 * 100}%`, opacity: time >= .9 ? 1 : .5 }} />}
              {agent.id === '01' && <i className={styles.eventMark} style={{ opacity: ease(progress(time, 4.6, 4.95)) }} />}
            </span>
          </>;
          return agent.id === '01'
            ? <button key={agent.id} className={className} onClick={selectResearch} aria-pressed={selected} aria-label="Inspect Research 01">{content}</button>
            : <div key={agent.id} className={className}>{content}</div>;
        })}
        <span className={styles.lineageTree} aria-hidden="true" />
      </div>
      <p className={styles.agentsFoot}>One resident reasoning model</p>
    </section>
  );
}
