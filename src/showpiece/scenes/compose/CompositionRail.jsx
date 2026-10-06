import { DocsLink, Icon, Landscape, ModelTile, SignalPath } from '../../components';
import { useStageLayout } from '../../playback/ShowpieceContext';
import { getEnrichFrame } from '../enrich/enrichFrame';
import { pointOnPolyline } from '../../motion/math';
import { useComposeFrame, useComposeUi } from './useCompose';
import { COMPOSITIONS, imageFrame, researchFrame, tween, voiceFrame, within } from './timeline';
import ReasoningLead from './ReasoningLead';
import styles from './ComposeScene.module.css';

/** A packet's presence, route and timing are declared together for each operation. */
function Route({ time, start, end, points, tokenPoints }) {
  const active = within(time, start, end);
  return <SignalPath points={points} tokenPoints={tokenPoints} active={active} progress={active ? tween(time, start, end) : null} opacity={active ? 1 : 0.28} />;
}

function CandidateStack({ time, frame }) {
  return <div className={styles.candidateGroup}><div className={styles.candidateStack}>{['01', '03', '05'].map((id, index) => {
    const target = id === '05' ? 0 : index + 1;
    const highlighted = (frame.rankActive && (time < 8.25 ? Math.floor((time - 7.08) / 0.39) % 3 === index : id === '05')) || (frame.ranked > 0 && id === '05');
    return <div className={`${styles.candidate} ${highlighted ? styles.candidateActive : ''}`} key={id} style={{ transform: `translateY(${(index + (target - index) * frame.ranked) * 21}px)` }}><b>{id}</b><i style={{ width: [56, 40, 65][index] }} /></div>;
  })}</div><span className={styles.candidateResult}>{time >= 10.38 ? 'Evidence returned' : time >= 9.05 ? '05 · returning evidence' : 'Candidate passages'}</span></div>;
}

function ResearchRail() {
  const { research } = useComposeFrame();
  const { compact, width } = useStageLayout();
  const time = research.time;
  const frame = researchFrame(time);
  const leadX = compact ? width * 0.27 - 34 : 48;
  const rankX = compact ? width * 0.73 - 34 : 48;
  const faceY = compact ? 113 : 132;
  const compactRoutes = {
    request: [['50%', 306], ['50%', 104], ['27%', 104], ['27%', 113]],
    tool: [['27%', 147], ['73%', 147]],
    result: [['73%', 113], ['73%', 97], ['27%', 97], ['27%', 113]],
    output: [['27%', 181], ['27%', 290], ['42%', 290], ['42%', 306]],
  };
  const routes = {
    request: [[156, 502], [142, 502], [142, 174], [128, 174]],
    tool: [[128, 174], [146, 174], [146, 317], [142, 317], [88, 336], [88, 347]],
    result: [[48, 387], [18, 387], [18, 174], [48, 174]],
    output: [[128, 174], [141, 174], [141, 173], [156, 173]],
  };
  return <>
    {[[styles.desktopRoutes, routes], [styles.compactRoutes, compactRoutes]].map(([layoutClass, paths]) => <svg key={layoutClass} className={`${styles.routes} ${layoutClass}`} aria-hidden="true"><Route time={time} start={4.8} end={5.65} points={paths.request} /><Route time={time} start={6.32} end={7.08} points={paths.tool} tokenPoints={layoutClass === styles.compactRoutes ? [[width * .27 + 34, 147], [width * .73 - 34, 147]] : undefined} /><Route time={time} start={9.55} end={10.38} points={paths.result} /><Route time={time} start={11.55} end={12.03} points={paths.output} /></svg>)}
    <ReasoningLead composition="research" x={leadX} y={faceY} status={frame.leadStatus} active={frame.leadActive} compact={compact} projector />
    <div className={styles.toolOperation} data-active={within(time, 6.05, 10.4)} style={{ opacity: frame.tool }}><small>TOOL CALL</small>Find sources</div>
    <div className={styles.rankPosition} style={{ '--model-x': `${rankX}px`, '--model-y': `${compact ? faceY : 347}px` }}><ModelTile model="qwen" label="Qwen 3 0.6B" role={frame.rankActive ? 'Scoring passages' : 'Reranker · own context'} active={frame.rankActive} small={compact} responsive /><CandidateStack time={time} frame={frame} /></div>
    <span className={styles.evidenceReturn} style={{ opacity: within(time, 9.55, 10.38) ? Math.sin(Math.PI * tween(time, 9.55, 10.38)) : 0 }}>05 · evidence → caller</span>
  </>;
}

function VoiceRail() {
  const { voice } = useComposeFrame();
  const { compact, width } = useStageLayout();
  const time = voice.time;
  const frame = voiceFrame(time);
  const leadX = compact ? width * 0.17 - 34 : 48;
  const whisperX = compact ? width * 0.5 - 34 : 54;
  const s1X = compact ? width * 0.83 - 34 : 54;
  const faceY = compact ? 123 : 132;
  const routes = compact ? {
    audio: [[width * 0.5, 306], [width * 0.5, faceY + 68]],
    normalize: [[whisperX + 68, faceY + 34], [s1X, faceY + 34]],
    clean: [[s1X + 34, faceY], [s1X + 34, 100], [leadX + 34, 100], [leadX + 34, faceY]],
    output: [[leadX + 34, faceY + 68], [leadX + 34, 289], [width * 0.3, 289], [width * 0.3, 306]],
  } : {
    audio: [[156, 503], [140, 503], [140, 338], [122, 338]],
    normalize: [[88, 372], [88, 450]],
    clean: [[54, 484], [17, 484], [17, 172], [48, 172]],
    output: [[128, 172], [156, 172]],
  };
  return <>
    <svg className={styles.routes} aria-hidden="true"><Route time={time} start={2.23} end={2.65} points={routes.audio} /><Route time={time} start={7.35} end={8} points={routes.normalize} /><Route time={time} start={9.25} end={10} points={routes.clean} /><Route time={time} start={11.6} end={11.95} points={routes.output} /></svg>
    <ReasoningLead composition="voice" x={leadX} y={faceY} active={frame.leadActive} compact={compact} />
    <div className={styles.pipelineNote}>{frame.leadActive ? frame.leadStatus : <><span>Custom pipeline</span><span>with <DocsLink href="https://docs.lloyal.ai/services">Services</DocsLink></span></>}</div>
    <div className={styles.whisperPosition} style={{ left: whisperX, top: compact ? faceY : 304 }}><ModelTile model="whisper" label="Whisper" role={frame.transcribing ? 'Transcribing audio' : time >= 7.6 ? 'Transcript returned' : 'Speech → text'} active={frame.transcribing} small /></div>
    <div className={styles.s1Position} style={{ left: s1X, top: compact ? faceY : 450 }}><ModelTile model="s1" label="S1-mini" role={frame.cleaning ? 'Cleaning filler words' : time >= 9.25 ? 'Clean text returned' : 'Text → clean text'} active={frame.cleaning} small /></div>
    <span className={styles.returnLabel} style={{ opacity: tween(time, 9.25, 10) }}>Cleaned instruction → lead</span>
  </>;
}

function ImageRail() {
  const { image } = useComposeFrame();
  const { compact, width } = useStageLayout();
  const time = image.time;
  const frame = imageFrame(time);
  const leadX = compact ? width * 0.27 - 34 : 48;
  const imageX = compact ? width * 0.73 - 34 : 48;
  const faceY = compact ? 123 : 132;
  const routes = compact ? {
    request: [[width * 0.5, 306], [width * 0.5, 102], [leadX + 34, 102], [leadX + 34, faceY]],
    tool: [[leadX + 68, faceY + 34], [imageX, faceY + 34]],
    result: [[imageX + 34, faceY], [imageX + 34, 96], [leadX + 34, 96], [leadX + 34, faceY]],
    output: [[leadX + 34, faceY + 68], [leadX + 34, 289], [width * 0.3, 289], [width * 0.3, 306]],
  } : {
    request: [[156, 503], [142, 503], [142, 172], [128, 172]],
    tool: [[88, 212], [88, 299], [88, 343], [88, 369]],
    result: [[48, 409], [17, 409], [17, 172], [48, 172]],
    output: [[128, 172], [156, 172]],
  };
  const returnedImagePosition = pointOnPolyline(routes.result, tween(time, 9.7, 10.85));
  return <>
    <svg className={styles.routes} aria-hidden="true"><Route time={time} start={3.2} end={4} points={routes.request} /><Route time={time} start={5.4} end={6.1} points={routes.tool} /><Route time={time} start={9.7} end={10.85} points={routes.result} /><Route time={time} start={11.85} end={12.2} points={routes.output} /></svg>
    <ReasoningLead composition="image" x={leadX} y={faceY} status={compact ? undefined : frame.leadStatus} active={frame.leadActive} compact={compact} projector />
    <div className={styles.imageTool} data-active={within(time, 5, 10.85)} style={{ opacity: 0.35 + 0.65 * tween(time, 5, 5.4) }}><small>MODEL CHOOSES TOOL</small>edit_image</div>
    <div className={styles.imagePosition} style={{ left: imageX, top: compact ? faceY : 369 }}><ModelTile model="qwen" label="Qwen Image Edit" role={frame.working ? 'Editing the reference' : time >= 9.7 ? 'Result returned' : 'Image specialist'} active={frame.working} small={compact} /></div>
    <span className={styles.returnLabel} style={{ opacity: tween(time, 9.6, 10.2) }}>Result → same live context</span>
    {!compact && within(time, 9.7, 10.85) && <div className={styles.previewReturn} style={{ left: returnedImagePosition.x - 33, top: returnedImagePosition.y - 18.5, opacity: tween(time, 9.7, 9.85) * (1 - tween(time, 10.55, 10.85)) }}><Landscape warm /></div>}
  </>;
}

function EnrichRail() {
  const { enrich } = useComposeFrame();
  const { compact, width } = useStageLayout();
  const frame = getEnrichFrame(enrich.time);
  const leadX = compact ? width * .27 - 34 : 48;
  const rankX = compact ? width * .73 - 34 : 48;
  const faceY = compact ? 123 : 132;
  const routes = compact ? {
    request: [[leadX + 68, faceY + 34], [rankX, faceY + 34]],
    result: [[rankX + 34, faceY], [rankX + 34, 97], [leadX + 34, 97], [leadX + 34, faceY]],
    output: [[leadX + 34, faceY + 68], [leadX + 34, 290], [width * .42, 290], [width * .42, 306]],
  } : {
    request: [[128, 172], [146, 172], [146, 317], [142, 317], [88, 336], [88, 347]],
    result: [[48, 387], [18, 387], [18, 172], [48, 172]],
    output: [[128, 172], [156, 172]],
  };
  return <>
    <svg className={styles.routes} aria-hidden="true">
      {Object.entries(routes).map(([id, points]) => <SignalPath key={id} points={points} active={frame.routing[id].active} progress={frame.routing[id].active ? frame.routing[id].progress : null} opacity={frame.routing[id].active ? 1 : .28} />)}
    </svg>
    <ReasoningLead composition="enrich" x={leadX} y={faceY} status={compact ? undefined : frame.leadStatus} active={frame.leadActive} compact={compact} />
    <div className={`${styles.toolOperation} ${styles.enrichOperation}`} data-active={frame.enriching}><small>TOOL CALL</small>Find row evidence</div>
    <div className={styles.rankPosition} style={{ '--model-x': `${rankX}px`, '--model-y': `${compact ? faceY : 347}px` }}><ModelTile model="qwen" label="Qwen 3 0.6B" role={frame.rerankerActive ? 'Scoring passages' : 'Reranker · own context'} active={frame.rerankerActive} small={compact} /></div>
    <div className={styles.enrichSources}><Icon name="document" size={18} /><span>Local sources</span></div>
    <span className={styles.returnLabel} style={{ opacity: frame.operation.stage === 'return' ? 1 : 0 }}>Ranked evidence → lead</span>
  </>;
}

const rails = { research: ResearchRail, voice: VoiceRail, image: ImageRail, enrich: EnrichRail };

export default function CompositionRail() {
  const frame = useComposeFrame();
  const { state } = useComposeUi();
  return <>{COMPOSITIONS.map(({ id }) => {
    const section = frame[id];
    const Component = rails[id];
    return section.visible && <div key={id} className={styles.rail} data-composition={id} style={{ opacity: section.opacity, transform: `translateY(${section.railY}px)`, pointerEvents: frame.active === id ? 'auto' : 'none', zIndex: state.leadMenuOpen === id ? 20 : undefined }} aria-hidden={frame.active !== id} inert={frame.active !== id}><Component /></div>;
  })}</>;
}
