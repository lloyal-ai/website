import styles from './Primitives.module.css';

const models = {
  qwen: { src: 'qwen-mark.svg', alt: 'Qwen' },
  gemma: { src: 'gemma-official.png', alt: 'Gemma 4' },
  glm: { src: 'glm-5.2-official.svg', alt: 'GLM 5.2' },
  whisper: { src: 'whisper-official.png', alt: 'Whisper' },
  s1: { src: 's1-mini-official.png', alt: 'S1-mini by Superwhisper' },
};

/** Original model marks; preserve their colours and approved proportions. */
export function ModelMark({ model = 'qwen', className = '', ...props }) {
  const mark = models[model] ?? models.qwen;
  return <img src={`/assets/showpiece/${mark.src}`} alt={mark.alt} draggable="false" className={`${styles.modelMark} ${className}`} {...props} />;
}
