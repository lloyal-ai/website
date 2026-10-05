import { Icon, Cursor } from '../../components';
import { useStageLayout } from '../../playback/ShowpieceContext';
import { useComposeFrame, useComposeUi } from './useCompose';
import { AppToolbar, Findings, ReportHeading, ReportRow, SourcePill } from './AppPrimitives';
import { cursorPosition, researchFrame, RESEARCH_QUESTION, typeText, tween, within } from './timeline';
import styles from './ComposeScene.module.css';

const abilityDescriptions = {
  documents: 'Documents: work with the files attached to this conversation.',
  corpus: 'Corpus: retrieve passages from your local knowledge collection.',
  web: 'Web: allow this application to use its configured web tools.',
};

function AttachmentTray({ opacity, time }) {
  const { state, dispatch } = useComposeUi();
  const hidden = !state.attachment || opacity <= 0.5;
  return <div className={styles.attachmentTray} inert={hidden} aria-hidden={hidden} style={{ opacity: state.attachment ? opacity : 0, transform: `translateY(${6 * (1 - tween(time, 1.45, 1.9))}px)`, pointerEvents: hidden ? 'none' : 'auto' }}><div className={styles.attachmentChip}><Icon name="document" size={12} /><span>research-notes.pdf</span><small>{time < 2 ? 'Adding…' : 'Ready'}</small><button type="button" onClick={() => dispatch({ type: 'attachment', value: false })} aria-label="Remove research-notes.pdf"><Icon name="close" size={11} /></button></div></div>;
}

function ResearchComposer({ frame, time }) {
  const { state, dispatch, playback, reducedMotion } = useComposeUi();
  const question = state.question ?? (time >= 13.5 ? '' : typeText(RESEARCH_QUESTION, time, 2.05, 4.05));
  const submit = (event) => {
    event.preventDefault();
    playback.seek(reducedMotion ? 16 : 4.45);
    playback.play();
  };
  return <>
    <div className={styles.composerArea}>
      <AttachmentTray time={time} opacity={frame.attachment} />
      <form className={styles.composer} onSubmit={submit}>
        <div className={styles.composerEntry}>
          <button className={styles.attach} type="button" aria-label="Attach an image or PDF" aria-expanded={state.attachmentMenuOpen} onClick={() => dispatch({ type: 'attachment-menu' })} style={{ background: within(time, 1.15, 1.43) ? '#ffffff14' : undefined }}><Icon name="attachment" size={15} /></button>
          <input className={styles.composerInput} value={question} onFocus={() => playback.pause()} onChange={(event) => dispatch({ type: 'question', value: event.target.value })} aria-label="Ask about this brief" placeholder={frame.busy ? 'Working with your notes…' : 'Ask about this brief — the context is still warm…'} autoComplete="off" />
        </div>
        <div className={styles.composerBottom}>
          {Object.entries(state.abilities).map(([name, enabled]) => <button key={name} type="button" className={`${styles.ability} ${enabled ? '' : styles.abilityInactive}`} aria-pressed={enabled} onClick={() => dispatch({ type: 'ability', name })}><i />{name}<Icon name="settings" size={10} /></button>)}
          <span className={styles.followUp}>Ask</span>
          <button type="submit" className={styles.send} aria-label="Play the illustrated follow-up" disabled={frame.busy} style={{ transform: `scale(${within(time, 4.51, 4.68) ? 0.9 : 1})` }}><Icon name="arrow" size={14} /></button>
        </div>
      </form>
    </div>
    {state.attachmentMenuOpen && <div className={styles.attachmentMenu}><small>Example attachment</small><button type="button" onClick={() => { dispatch({ type: 'attachment', value: true }); playback.seek(1.9); }}><Icon name="document" size={13} />research-notes.pdf</button><small>Local fixture for this illustrated interaction.</small></div>}
    {state.abilityHint && <div className={styles.abilityHint} role="status">{abilityDescriptions[state.abilityHint]}</div>}
  </>;
}

export default function ResearchApp() {
  const { research } = useComposeFrame();
  const { compact, width } = useStageLayout();
  const time = research.time;
  const frame = researchFrame(time);
  const bodyWidth = width - 306;
  const cursor = cursorPosition(time, [[0, bodyWidth - 105, 504], [0.7, bodyWidth - 105, 504], [1.15, 32, 382], [1.4, 32, 382], [2, 102, 382], [4.15, bodyWidth - 40, 429], [4.72, bodyWidth - 40, 429], [5.2, bodyWidth + 25, 504], [18.5, bodyWidth + 25, 504]]);
  return <>
    <AppToolbar state={frame.state} working={frame.busy} />
    <div className={styles.researchContent}>
      <ReportHeading />
      <div className={styles.reportViewport}><div style={{ transform: `translateY(${frame.reportY}px)` }}>
        <ReportRow number="01" title="Findings"><Findings /></ReportRow>
        <ReportRow number="02" title="Sources"><p>Open the original passage.</p><div className={styles.sourcePills} style={{ opacity: frame.evidence }}><SourcePill>research-notes.pdf <span>· 05</span></SourcePill></div></ReportRow>
        <ReportRow number="03" title="Next steps"><p>Compare the evidence. Continue the brief.</p><div className={styles.sourcePills}><SourcePill document={false}>Follow-up ready <Icon name="arrow" size={12} /></SourcePill></div></ReportRow>
      </div></div>
    </div>
    <div className={styles.requestState} style={{ opacity: frame.notice }}><Icon name="check" size={11} />Notes added to the brief</div>
    <ResearchComposer time={time} frame={frame} />
    {!compact && <Cursor {...cursor} visible={time < 0.4 ? time / 0.4 : time > 4.85 ? 1 - tween(time, 4.85, 5.25) : 1} pressed={within(time, 1.17, 1.34)} />}
  </>;
}
