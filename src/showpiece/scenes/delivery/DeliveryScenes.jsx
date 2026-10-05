import { AppWindow, Icon } from '../../components'
import { usePlaybackActions, useSceneTime, useStageLayout } from '../../playback/ShowpieceContext'
import { getLaunchFrame, getShipFrame } from './deliveryFrame'
import { ShipTerminal } from './ShipTerminal'
import styles from './DeliveryScenes.module.css'

function Activity({ active, time, className = '' }) {
  return <span className={`${styles.activity} ${className}`} aria-hidden="true" style={{ transform: `rotate(${active ? time * 220 : 0}deg)`, opacity: active ? 1 : 0.35 }} />
}

function ReplayButton({ label }) {
  const { restart, play } = usePlaybackActions()
  return <button className={styles.replay} onClick={() => { restart(); play() }} aria-label={`Replay ${label} illustration`}><Icon name="play" size={11} /><span>Replay</span></button>
}

function DiskImage({ reveal }) {
  return (
    <div className={styles.artifact} style={{ opacity: reveal, transform: `translateX(${28 * (1 - reveal)}px)` }}>
      <svg className={styles.diskIcon} viewBox="0 0 86 107" fill="none" aria-hidden="true">
        <path d="M10 1.5h45L76 23v73.5a9 9 0 0 1-9 9H10a9 9 0 0 1-9-9v-86a9 9 0 0 1 9-9Z" fill="#d8d8dc" stroke="#f1f1f3" />
        <path d="M55 1.5V18a5 5 0 0 0 5 5h16" fill="#afafb6" stroke="#f1f1f3" strokeLinejoin="round" />
        <rect x="14" y="44" width="48" height="33" rx="5" fill="#6a6a73" stroke="#55555f" /><path d="M14 66h48" stroke="#a4a4ad" />
        <circle cx="53" cy="71" r="1.5" fill="#dddde2" /><path d="M20 71h18" stroke="#b9b9c1" strokeWidth="1.3" strokeLinecap="round" />
        <text x="38" y="94" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9" fontWeight="600" letterSpacing="1.1" fill="#53535d">DMG</text>
      </svg>
      <div><p className={styles.artifactName}>Your-App.dmg</p><p className={styles.artifactState}><Icon name="check" size={12} />Signed · Notarized</p><p className={styles.artifactDetail}>Ticket stapled</p></div>
      <p className={styles.modelNote}>Model files provision<br />on first launch.</p>
    </div>
  )
}

export function ShipScene() {
  const time = useSceneTime()
  const { compact } = useStageLayout()
  const frame = getShipFrame(time)
  return (
    <div className={`${styles.scene} ${styles.shipScene} ${compact ? styles.compact : ''}`} data-scene="ship">
      <p className={styles.caption}>From your code to their Applications folder</p>
      <ShipTerminal frame={frame} time={time} className={styles.terminal} replay={<ReplayButton label="build" />} />
      <p className={styles.qualifier}>Illustrated macOS build · signing configured</p>
      <div className={styles.exportArrow} style={{ opacity: frame.artifact }} aria-hidden="true"><Icon name="arrow" size={22} /></div>
      <DiskImage reveal={frame.artifact} />
    </div>
  )
}

function ProvisionRow({ model, time }) {
  return <div className={styles.provisionRow} data-status={model.status}>
    <Icon name={model.icon} size={22} className={styles.modelIcon} />
    <div className={styles.modelIdentity}><div className={styles.modelName}>{model.name}</div><div className={styles.modelRole}>{model.role}</div></div>
    <div className={styles.modelState}>
      {model.status === 'verified' ? <span className={styles.verified}><Icon name="check" size={13} />Digest verified</span> : model.status === 'downloading' ? <><div className={styles.progressLabel}>Downloading</div><div className={styles.progressTrack} role="progressbar" aria-label={`${model.name} illustrative download progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(model.progress * 100)}><span style={{ transform: `scaleX(${model.progress})` }} /></div></> : model.status === 'verifying' ? <span className={styles.verifying}><Activity active time={time} />Checking digest</span> : <span className={styles.waiting}>Waiting</span>}
    </div>
  </div>
}

function FreshWorkspace({ caret }) {
  return <div className={styles.workspace}>
    <div className={styles.workspaceSidebar}><div className={styles.workspaceApp}><Icon name="panel" size={17} /><span>Your App</span></div><span className={styles.newSession}><Icon name="play" size={10} />New session</span><div className={styles.sidebarFoot}><span className={styles.readyDot} />Runs on this machine</div></div>
    <div className={styles.emptyWorkspace}>
      <div className={styles.emptyIntro}><span className={styles.emptyIcon}><Icon name="panel" size={25} /></span><h3>What would you like to explore?</h3><p>Your models are ready.<br />Start with a question or attach a document.</p></div>
      <div className={styles.freshComposer} aria-label="Fresh AI workspace with an empty question composer">
        <div className={styles.composerInput}><Icon name="attachment" size={16} /><span>Ask a question<span className={styles.inputCaret} style={{ opacity: caret ? 1 : 0 }} /></span></div>
        <div className={styles.composerFooter}><div className={styles.abilities}><span><Icon name="document" size={11} />Documents</span><span><Icon name="folder" size={11} />Corpus</span><span className={styles.inactiveAbility}><Icon name="globe" size={11} />Web</span></div><span className={styles.sendIcon}><Icon name="arrow" size={14} /></span></div>
      </div>
      <span className={styles.emptyNote}>Fresh workspace · No existing conversation</span>
    </div>
  </div>
}

export function LaunchScene() {
  const time = useSceneTime()
  const { compact } = useStageLayout()
  const frame = getLaunchFrame(time)
  return (
    <div className={`${styles.scene} ${styles.launchScene} ${compact ? styles.compact : ''}`} data-scene="launch">
      <p className={styles.caption}>One install. Intelligence inside the app.</p>
      <div className={styles.appIdentity}><span className={styles.appIcon}><Icon name="panel" size={34} /></span><p>Your App</p><small>{frame.allVerified ? 'Ready to use' : 'First launch'}</small></div>
      <AppWindow title="Your App" offline={frame.workspace === 1} className={styles.launchWindow}>
        <div className={styles.provisioning} style={{ opacity: 1 - frame.workspace, transform: `translateY(${-8 * frame.workspace}px)`, visibility: frame.workspace === 1 ? 'hidden' : 'visible' }} aria-hidden={frame.workspace === 1}>
          <div className={styles.launchHeading}><h3>{frame.allVerified ? 'Your App is ready' : 'Getting Your App ready'}</h3><p>{frame.allVerified ? 'Model files are downloaded and verified.' : 'Preparing the models that run on your machine.'}</p></div>
          <div className={styles.machine}><Icon name="desktop" size={18} /><span>This machine</span><span className={styles.machineStatus}>{frame.machine === 'ready' ? <><Icon name="check" size={13} />Ready</> : frame.machine === 'checking' ? <><Activity active time={time} />Checking compatibility</> : 'Waiting'}</span></div>
          <div className={styles.provisionList}>{frame.models.map(model => <ProvisionRow model={model} time={time} key={model.id} />)}</div>
          <div className={styles.provisionMeta}><span className={styles.firstRun}>First run only</span><span>Model files stay on this machine.</span></div>
          <div className={styles.launchReady} style={{ opacity: frame.ready }}><Icon name="check" size={13} /><span>Opening a fresh workspace</span></div>
        </div>
        <div className={styles.workspaceReveal} style={{ opacity: frame.workspace, transform: `translateY(${12 * (1 - frame.workspace)}px)`, visibility: frame.workspace === 0 ? 'hidden' : 'visible' }} aria-hidden={frame.workspace === 0}><FreshWorkspace caret={frame.caret} /></div>
        <div className={styles.launchFooter}><span>{frame.workspace > 0 ? 'Ready to work offline' : 'Preparing your configured models'}</span><ReplayButton label="first launch" /></div>
      </AppWindow>
    </div>
  )
}
