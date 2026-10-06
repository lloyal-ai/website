import { useId, useRef } from 'react';
import { Icon, ModelMark, ModelTile } from '../../components';
import { useComposeUi } from './useCompose';
import { availableLeadModels, REASONING_MODELS } from './composeState';
import styles from './ComposeScene.module.css';

function ModelChooser({ composition }) {
  const { state, dispatch, playback } = useComposeUi();
  const id = useId();
  const trigger = useRef(null);
  const isOpen = state.leadMenuOpen === composition;
  const close = () => dispatch({ type: 'close-lead-menu' });
  return <div className={styles.modelChooser} onBlur={event => {
    if (isOpen && !event.currentTarget.contains(event.relatedTarget)) close();
  }} onKeyDown={event => {
    if (event.key === 'Escape' && isOpen) { event.stopPropagation(); close(); trigger.current?.focus(); }
  }}>
    <button ref={trigger} className={styles.changeModel} type="button" aria-label="Choose reasoning model" aria-controls={id} aria-expanded={isOpen} onClick={() => { playback.pause(); dispatch({ type: 'lead-menu', composition }); }}>Change model <Icon name="chevron" size={10} /></button>
    {isOpen && <div id={id} className={styles.modelMenu}><header>{composition === 'image' ? 'Vision + reasoning' : 'Reasoning model'}</header>{availableLeadModels(composition).map(([model, { label }]) => <button type="button" key={model} aria-pressed={model === state.leads[composition]} onClick={() => {
      dispatch({ type: 'select-lead', composition, value: model });
      trigger.current?.focus();
    }}><ModelMark model={model} /><span>{label}</span>{model === state.leads[composition] && <Icon name="check" size={12} />}</button>)}<small>{composition === 'image' ? 'A paired vision projector.' : 'One lead model per run.'}</small></div>}
  </div>;
}

/** All composition examples share one lead tile and control geometry. */
export default function ReasoningLead({ composition, x, y, status, active, compact, projector = false }) {
  const { state } = useComposeUi();
  const model = state.leads[composition];
  const { label, vision } = REASONING_MODELS[model];
  return <div className={styles.leadPosition} data-reasoning-lead={composition} style={{ '--model-x': `${x}px`, '--model-y': `${y}px` }}>
    <ModelTile model={model} label={label} role={composition === 'image' ? 'Vision + reasoning' : 'Reasoning model'} status={status} active={active} small={compact} responsive />
    {projector && vision && <span className={styles.projector} title={`${label} paired vision projector`}><Icon name="projector" size={17} /></span>}
    <ModelChooser composition={composition} />
  </div>;
}
