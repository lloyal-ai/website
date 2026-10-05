import { Cursor, Icon } from '../../components';
import { useStageLayout } from '../../playback/ShowpieceContext';
import { useComposeFrame, useComposeUi } from './useCompose';
import { REASONING_MODELS } from './composeState';
import { AppToolbar, Findings, ReportHeading, ReportRow } from './AppPrimitives';
import { cursorPosition, RAW_TRANSCRIPT, RESEARCH_QUESTION, tween, typeText, voiceFrame, within } from './timeline';
import styles from './ComposeScene.module.css';

function Filler({ text, width, amount }) {
  return <span className={styles.collapsingFiller} style={{ width: `${width * (1 - tween(amount, 0.3, 1))}em`, opacity: 1 - Math.min(1, amount / 0.3) }}>{text}</span>;
}

function Transcript({ time }) {
  if (time < 2.2) return <span className={styles.transcriptEmpty}>Ask with your voice…</span>;
  if (time < 8.3) {
    const text = typeText(RAW_TRANSCRIPT, time, 2.75, 6.7);
    const chunks = text.split(/(Umm,|ah,)/g);
    return <>{chunks.map((chunk, index) => <span key={index} className={chunk === 'Umm,' || chunk === 'ah,' ? styles.filler : undefined}>{chunk}</span>)}{time < 6.7 && <i className={styles.transcriptCaret} />}</>;
  }
  if (time < 8.95) {
    const amount = tween(time, 8.3, 8.95);
    return <><Filler text="Umm, " width={2.88} amount={amount} />{amount < 0.3 ? 'compare' : 'Compare'} these notes<Filler text="," width={0.3} amount={amount} /> <Filler text="ah, " width={1.66} amount={amount} />with the brief.</>;
  }
  return RESEARCH_QUESTION;
}

function Waveform({ time, recording }) {
  return <div className={styles.waveform} aria-hidden="true">{Array.from({ length: 63 }, (_, index) => {
    const pattern = (Math.sin(index * 1.71) + Math.sin(index * 0.49 + 1) + 2) / 4;
    const activity = recording ? 0.42 + 0.58 * Math.abs(Math.sin(time * 8.4 - index * 0.48)) : time >= 6.65 ? 0.6 : 0;
    return <i key={index} style={{ height: 3 + pattern * 15 * activity, opacity: time >= 2.2 ? 0.4 + pattern * 0.5 : 0.22 }} />;
  })}</div>;
}

function VoiceComposer({ frame, time }) {
  const { state, playback, reducedMotion } = useComposeUi();
  const startIllustration = () => { playback.seek(reducedMotion ? 31.2 : 20.45); playback.play(); };
  return <div className={styles.voiceComposer} data-recording={frame.recording}>
    <div className={styles.transcript}><Transcript time={time} /></div>
    <button type="button" className={styles.mic} data-recording={frame.recording} aria-label="Play the illustrated voice recording" onClick={startIllustration} style={{ transform: `scale(${within(time, 2.05, 2.23) ? 0.93 : 1})` }}>{frame.recording ? <span className={styles.micStop} /> : <Icon name="mic" size={19} />}</button>
    <div className={styles.pipelinePill} data-complete={time >= 10}><i /><span>{time >= 10 ? `Clean instruction received by ${REASONING_MODELS[state.leads.voice].name}` : 'Voice · Whisper + S1-mini'}</span><span className={styles.cleanBadge} style={{ opacity: tween(time, 8.9, 9.3) }}>Cleaned</span></div>
    <div className={styles.recordingTrack}><span className={styles.recordingDot} style={{ opacity: frame.recording ? 1 : 0.3 }} /><span className={styles.recordingClock}>00:{String(Math.min(4, Math.floor(Math.max(0, time - 2.2)))).padStart(2, '0')}</span><Waveform time={time} recording={frame.recording} /><span className={styles.recordingLabel}>{frame.recordingLabel}</span></div>
  </div>;
}

export default function VoiceApp() {
  const { voice } = useComposeFrame();
  const { compact, width } = useStageLayout();
  const time = voice.time;
  const frame = voiceFrame(time);
  const bodyWidth = width - 306;
  const cursor = cursorPosition(time, [[0, bodyWidth - 10, 483], [0.6, bodyWidth - 10, 483], [1.7, bodyWidth - 50, 360], [2.25, bodyWidth - 50, 360], [2.85, bodyWidth - 10, 483], [16, bodyWidth - 10, 483]]);
  return <>
    <AppToolbar state={frame.state} working={within(time, 2.2, 12)} />
    <div className={styles.voiceContent}>
      <ReportHeading />
      <ReportRow number="01" title="Findings" className={styles.voiceRow}><Findings /></ReportRow>
      <ReportRow number="02" title="Sources" className={styles.voiceRow} style={{ opacity: 1 - frame.answer, height: 52 * (1 - frame.answer), marginTop: 19 * (1 - frame.answer), overflow: 'hidden' }}><p>Your notes, alongside the original evidence.</p></ReportRow>
      <ReportRow number="03" title="Comparison added" className={styles.voiceAnswer} style={{ opacity: frame.answer, transform: `translateY(${8 * (1 - frame.answer)}px)` }}><p>The brief now highlights where your notes agree with the evidence.</p></ReportRow>
    </div>
    <VoiceComposer time={time} frame={frame} />
    {!compact && <Cursor {...cursor} visible={tween(time, 0.55, 0.8) * (1 - tween(time, 2.4, 2.9))} pressed={within(time, 2.05, 2.23)} />}
  </>;
}
