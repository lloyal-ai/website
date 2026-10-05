import styles from './Primitives.module.css';

/** A quiet documentation affordance that inherits its surrounding UI type. */
export function DocsLink({ href, children, className = '', ...props }) {
  return <a className={`${styles.docsLink} ${className}`} href={href} target="_blank" rel="noreferrer" {...props}>{children} <span aria-hidden="true">→</span></a>;
}
