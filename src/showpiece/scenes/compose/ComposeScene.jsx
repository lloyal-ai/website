import { AppWindow, WindowBody, Icon, ModelMark } from '../../components';
import { useStageLayout } from '../../playback/ShowpieceContext';
import { ComposeProvider } from './ComposeContext';
import { useComposeFrame, useComposeUi } from './useCompose';
import { Sidebar } from './AppPrimitives';
import { COMPOSITIONS } from './timeline';
import { REASONING_MODELS } from './composeState';
import CompositionRail from './CompositionRail';
import ResearchApp from './ResearchApp';
import VoiceApp from './VoiceApp';
import ImageApp from './ImageApp';
import EnrichApp from './EnrichApp';
import styles from './ComposeScene.module.css';

const appExamples = { research: ResearchApp, voice: VoiceApp, image: ImageApp, enrich: EnrichApp };
const captions = {
  research: 'Example compositions · one lead, your choice of specialists',
  voice: 'Your code routes. Your model reasons.',
  image: 'Your model chooses. Your app responds.',
  enrich: 'A spreadsheet template. Intelligence inside each cell.',
};

function CompositionChoices() {
  const { active } = useComposeFrame();
  const { state, dispatch, playback, reducedMotion } = useComposeUi();
  return <div className={styles.choices} role="group" aria-label="Example model compositions">{COMPOSITIONS.map((composition) => {
    const model = state.leads[composition.id];
    return <button key={composition.id} type="button" className={`${styles.choice} ${active === composition.id ? styles.choiceActive : ''}`} aria-pressed={active === composition.id} onClick={() => { dispatch({ type: 'new-example' }); playback.seek(reducedMotion ? composition.still : composition.start); playback.play(); }}><ModelMark model={model} /><span>{REASONING_MODELS[model].name}<em> · {composition.purpose}</em></span></button>;
  })}</div>;
}

function ComposeStage() {
  const frame = useComposeFrame();
  const { compact } = useStageLayout();
  return <div className={`${styles.scene} ${compact ? styles.compact : ''}`} data-compose-example={frame.active}>
    <div className={styles.caption}>{captions[frame.active]}</div>
    <CompositionChoices />
    <CompositionRail />
    <AppWindow title="Your App" connection={frame.active === 'enrich' ? 'connected' : 'offline'} className={styles.appWindow} aria-label="Your App — illustrated composition examples">
      <div className={styles.appViewport}>{COMPOSITIONS.map(({ id }) => {
        const phase = frame[id];
        const Component = appExamples[id];
        return phase.visible && <div key={id} className={styles.appExample} data-app-example={id} style={{ transform: `translateY(${phase.bodyY}px)`, opacity: id === 'research' ? phase.opacity : 1, pointerEvents: frame.active === id ? 'auto' : 'none' }} aria-hidden={frame.active !== id} inert={frame.active !== id}><WindowBody sidebar={!compact && id !== 'enrich' && <Sidebar wiki={id === 'image'} />}><Component /></WindowBody></div>;
      })}</div>
    </AppWindow>
    <div className={styles.targets} aria-label="Supported app targets"><span><Icon name="desktop" size={11} />Desktop</span><span><Icon name="terminal" size={11} />CLI</span><span><Icon name="globe" size={11} />Web</span></div>
  </div>;
}

export default function ComposeScene() {
  return <ComposeProvider><ComposeStage /></ComposeProvider>;
}
