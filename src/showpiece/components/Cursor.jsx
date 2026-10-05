import styles from './Primitives.module.css';

export function Cursor({ x = 0, y = 0, visible = true, pressed = false, className = '' }) {
  return (
    <svg className={`${styles.cursor} ${className}`} viewBox="0 0 19 24" aria-hidden="true" style={{ opacity: Number(visible), transform: `translate(${x}px, ${y}px) scale(${pressed ? 0.91 : 1})` }}>
      <path d="M2 2v17l4.5-4 3.2 6.9 2.7-1.2-3.2-6.6H16Z" fill="#e8e8eb" stroke="#111114" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
