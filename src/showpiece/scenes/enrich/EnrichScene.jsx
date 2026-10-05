import { useState } from 'react'
import { AppWindow, Cursor, Icon, ModelTile } from '../../components'
import { usePlaybackActions, usePlaybackState, useSceneTime, useStageLayout } from '../../playback/ShowpieceContext'
import { getEnrichFrame } from './enrichFrame'
import styles from './EnrichScene.module.css'

function Evidence({ row, opacity }) {
  return (
    <aside className={styles.evidence} style={{ opacity, transform: `translateY(${8 * (1 - opacity)}px)` }} aria-label={`Evidence for ${row.company}`}>
      <div className={styles.evidenceSource}><Icon name="document" size={13} /><span>{row.company} · {row.source}</span></div>
      <p>“{row.evidence}”</p>
      <span className={styles.evidenceCaption}>Source attached to this cell</span>
    </aside>
  )
}

export default function EnrichScene() {
  const time = useSceneTime()
  const { compact, width } = useStageLayout()
  const { revision } = usePlaybackState()
  const { restart, play } = usePlaybackActions()
  const [selection, setSelection] = useState(null)
  const frame = getEnrichFrame(time)
  const userSelection = selection?.revision === revision && selection?.time <= time ? selection.row : null
  const selectedIndex = userSelection ?? frame.selected
  const selectedRow = frame.rows[selectedIndex]
  const showEvidence = userSelection !== null && selectedRow.status === 'complete' ? 1 : frame.evidence
  const replay = () => { setSelection(null); restart(); play() }

  return (
    <div className={`${styles.scene} ${compact ? styles.compact : ''}`} data-scene="enrich">
      <p className={styles.caption}>A spreadsheet that thinks</p>
      <div className={styles.rail}>
        <ModelTile model="qwen" label="Qwen" role="Reasoning model" status={compact ? undefined : frame.enriching ? 'Enriching rows' : frame.completed === 4 ? 'Evidence attached' : 'Ready to enrich'} active={frame.enriching} />
        <div className={styles.sources}><Icon name="document" size={22} /><span>Local sources</span><small>Evidence for each cell</small></div>
      </div>
      <div className={styles.connection} aria-hidden="true"><span style={{ left: `${frame.signalProgress * 100}%`, opacity: frame.enriching ? 1 : 0.3 }} /></div>
      <AppWindow title="Your App" offline className={styles.window}>
        <div className={styles.header}>
          <div><h3>A spreadsheet that thinks</h3><p>Template preview · Sample workspace</p></div>
          <button className={styles.enrichButton} onClick={replay} style={{ transform: frame.pressed ? 'translateY(1px)' : undefined }} aria-label="Replay row enrichment illustration"><span>Enrich rows</span><Icon name="arrow" size={12} /></button>
        </div>
        <table className={styles.table} aria-label="Fictional prospect records enriched from local sources">
          <thead><tr><th aria-label="Row number" /><th>Company</th><th className={styles.extraColumn}>Sector</th><th className={styles.extraColumn}>Fit</th><th>Signal</th></tr></thead>
          <tbody>{frame.rows.map((row, index) => (
            <tr key={row.id} data-status={row.status}>
              <td className={styles.rowNumber}>{row.id}</td>
              <td><span>{row.company}</span><small className={styles.mobileDetails}>{row.status === 'complete' ? `${row.sector} · ${row.fit}` : 'Local source fixture'}</small></td>
              <td className={styles.extraColumn}><span className={styles.reveal} style={{ opacity: row.status === 'complete' ? row.reveal : 0.35 }}>{row.status === 'complete' ? row.sector : '—'}</span></td>
              <td className={styles.extraColumn}><span style={{ opacity: row.status === 'complete' ? row.reveal : 0.35 }}>{row.status === 'complete' ? row.fit : '—'}</span></td>
              <td className={styles.signalCell} data-selected={selectedIndex === index}>
                <button className={styles.cellButton} disabled={row.status !== 'complete'} aria-pressed={selectedIndex === index} onClick={() => setSelection({ row: index, revision, time })} aria-label={`Inspect evidence for ${row.company}`}>
                  {row.status === 'complete' ? <span className={styles.cellResult} style={{ opacity: row.reveal, transform: `translateY(${5 * (1 - row.reveal)}px)` }}><Icon name="check" size={11} /><span>{row.signal}<span className={styles.cellArrow}>↗</span></span></span> : <span className={row.status === 'reading' ? styles.reading : styles.queued}>{row.status === 'reading' ? 'Reading evidence…' : 'Queued'}</span>}
                </button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        <div className={styles.evidenceArea}>{showEvidence > 0 && <Evidence row={selectedRow} opacity={showEvidence} />}</div>
        <footer className={styles.footer}><span className={styles.progress} data-active={frame.enriching}>{frame.completed === 4 && <Icon name="check" size={11} />}{frame.completed} of 4 rows enriched</span><span>Fictional records · Local source fixture</span></footer>
      </AppWindow>
      {!compact && <Cursor x={width - 240 + 105 * frame.cursor} y={377 - 240 * frame.cursor} visible={frame.cursorVisible} pressed={frame.pressed} />}
    </div>
  )
}
