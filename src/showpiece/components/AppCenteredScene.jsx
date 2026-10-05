import { useStageLayout } from '../playback/ShowpieceContext';
import styles from './AppCenteredScene.module.css';

/** Move a scene as one coordinate space so its app, rail and cursors stay aligned. */
export function AppCenteredScene({ children, className = '', centerOffset = 66, style, ref, ...props }) {
  const { compact } = useStageLayout();
  return <div
    {...props}
    ref={ref}
    className={`${styles.scene} ${className}`}
    style={{ '--sp-app-center-offset': compact ? '0px' : `${centerOffset}px`, ...style }}
  >{children}</div>;
}
