import { AppWindow } from '../../components'
import { useStageLayout } from '../../playback/ShowpieceContext'
import styles from './ShipTerminal.module.css'

const SPINNER = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

function BuildLogLine({ step, time }) {
  const complete = step.status === 'complete'
  return (
    <div className={styles.logLine} data-status={step.status}>
      <span className={styles.status} aria-label={complete ? 'Complete' : 'Running'}>
        {complete ? '✓' : SPINNER[Math.floor(time * 10) % SPINNER.length]}
      </span>
      <span className={styles.operation}>{step.label.toLowerCase()}</span>
      <span className={styles.detail}>{complete ? step.completeDetail ?? step.detail : step.detail}</span>
    </div>
  )
}

/** Shell presentation stays independent of the end-user installer. */
export function ShipTerminal({ frame, time, className, replay }) {
  const { compact } = useStageLayout()
  const [command, options] = frame.command.split(/(?= --)/)
  return (
    <AppWindow title="your-app — zsh" aria-label="Developer terminal — build and ship Your App" chromeIcon="terminal" className={`${styles.terminal} ${className}`} data-compact={compact || undefined}>
      <div className={styles.body}>
        <p className={styles.directory}>~/projects/your-app</p>
        <div className={styles.command} aria-label="npx lloyal-ai ship --notarize">
          <span className={styles.prompt} aria-hidden="true">❯</span>
          <code>{command}{options && <span className={styles.options}>{options}</span>}<span className={styles.caret} style={{ opacity: frame.caret ? 1 : 0 }} /></code>
        </div>
        <div className={styles.log} aria-label="Build output">
          {frame.steps.filter(step => step.status !== 'queued').map(step => <BuildLogLine key={step.id} step={step} time={time} />)}
        </div>
        <div className={styles.result} style={{ opacity: frame.output }} aria-hidden={frame.output === 0}>
          <p><span className={styles.success}>✓</span> Created <strong>release/Your-App.dmg</strong></p>
          <p className={styles.receipt}>Signed · notarized · ticket stapled</p>
          <div className={styles.returnPrompt} aria-hidden="true"><span className={styles.prompt}>❯</span><span className={styles.caret} /></div>
        </div>
      </div>
      <div className={styles.footer}><span>zsh<span className={styles.footerDivider}>/</span>~/projects/your-app</span>{replay}</div>
    </AppWindow>
  )
}
