import { useEffect, useRef, useState } from 'react';
import styles from './Command.module.css';

const RUNNER = 'npx';
const ARGUMENTS = 'lloyal-ai new';
const COMMAND = `${RUNNER} ${ARGUMENTS}`;

export default function Command({ animate = true }) {
  const [status, setStatus] = useState('idle');
  const feedbackTimer = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(feedbackTimer.current);
    };
  }, []);

  async function copy() {
    clearTimeout(feedbackTimer.current);
    setStatus('copying');
    try {
      await navigator.clipboard.writeText(COMMAND);
      if (!mounted.current) return;
      setStatus('copied');
      feedbackTimer.current = setTimeout(() => setStatus('idle'), 1800);
    } catch {
      if (mounted.current) setStatus('error');
    }
  }

  return <div className={styles.root} style={{ '--command-characters': COMMAND.length }}>
    <button className={styles.button} type="button" onClick={copy} disabled={status === 'copying'} aria-label={`Copy ${COMMAND}`} data-copy-state={status}>
      <span className={styles.prompt} aria-hidden="true">$</span>
      <code className={styles.text} aria-hidden="true"><span className={styles.typewriter} data-animate={animate}><span className={styles.runner}>{RUNNER}</span>{` ${ARGUMENTS}`}</span></code>
      <svg className={styles.copyIcon} width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {status === 'copied' ? <path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/> : <><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor"/><path d="M10 3H4a1 1 0 0 0-1 1v6" stroke="currentColor"/></>}
      </svg>
    </button>
    <span className={status === 'error' ? styles.feedback : styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
      {status === 'copied' && 'Command copied to clipboard.'}
      {status === 'error' && <><span className={styles.srOnly}>Clipboard unavailable. </span>Copy manually: <code>{COMMAND}</code></>}
    </span>
  </div>;
}
