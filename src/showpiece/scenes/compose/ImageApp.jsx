import { Cursor, Icon, Landscape } from '../../components';
import { useStageLayout } from '../../playback/ShowpieceContext';
import { useComposeFrame, useComposeUi } from './useCompose';
import { AppToolbar } from './AppPrimitives';
import { cursorPosition, imageFrame, IMAGE_QUESTION, tween, typeText, within } from './timeline';
import styles from './ComposeScene.module.css';

function WikiCover({ frame, time }) {
  return <div className={styles.cover}>
    <Landscape warm={false} className={styles.landscape} />
    <Landscape warm className={styles.landscape} style={{ opacity: frame.updated }} />
    <span className={styles.coverTag}>{time >= 12.9 ? 'Sunrise cover' : 'Original cover'}</span>
    {frame.working && <div className={styles.generationMask} style={{ width: `${100 * tween(time, 6.1, 9.7)}%` }} />}
    <span className={styles.coverCheck} style={{ opacity: tween(time, 12.9, 13.3) }}><Icon name="check" size={10} />Cover updated</span>
  </div>;
}

function ImageComposer({ frame, time }) {
  const { playback, reducedMotion } = useComposeUi();
  const sendIllustration = () => { playback.seek(reducedMotion ? 48 : 37.48); playback.play(); };
  return <div className={styles.imageComposer}>
    <span className={styles.imageChip}><Icon name="image" size={11} />alpine-cover.png<span>· Reference image</span></span>
    <div className={styles.imageEntry}><Icon name="attachment" size={14} /><span className={time >= 13.2 ? styles.placeholder : undefined}>{time >= 13.2 ? 'Ask about this page…' : typeText(IMAGE_QUESTION, time, 0.95, 2.85)}</span></div>
    <div className={styles.imageFooter}><span className={styles.imageAbility}>images</span><span className={styles.imageAbility}>wiki</span><span className={styles.miniState}>{frame.busy ? 'Working with your image' : 'Ask'}</span><button type="button" className={styles.send} aria-label="Play the illustrated image request" onClick={sendIllustration} disabled={frame.busy} style={{ transform: `scale(${within(time, 3.05, 3.23) ? 0.9 : 1})` }}><Icon name="arrow" size={14} /></button></div>
  </div>;
}

export default function ImageApp() {
  const { image } = useComposeFrame();
  const { compact, width } = useStageLayout();
  const time = image.time;
  const frame = imageFrame(time);
  const bodyWidth = width - 306;
  const cursor = cursorPosition(time, [[0, bodyWidth - 9, 483], [2.5, bodyWidth - 9, 483], [3, bodyWidth - 44, 424], [3.24, bodyWidth - 44, 424], [3.85, bodyWidth - 9, 483], [15.5, bodyWidth - 9, 483]]);
  return <>
    <AppToolbar title="Product wiki" state={frame.state} working={frame.busy} />
    <div className={styles.imageContent}><div className={styles.wikiEyebrow}>Your knowledge base</div><h2>Alpine field guide</h2><WikiCover frame={frame} time={time} /><p className={styles.wikiSummary}>A living guide to the places, routes and observations your team collects.</p></div>
    <ImageComposer frame={frame} time={time} />
    {!compact && <Cursor {...cursor} visible={tween(time, 2.35, 2.7) * (1 - tween(time, 3.35, 3.85))} pressed={within(time, 3.05, 3.23)} />}
  </>;
}
