import { useState } from 'react'
import { Cursor, Icon } from '../../components'
import { getEnrichFrame } from './enrichFrame'
import styles from './EnrichWorkspace.module.css'

function Evidence({ row, opacity }) {
  return (
    <aside className={styles.evidence} style={{ opacity, transform: `translateY(${8 * (1 - opacity)}px)` }} aria-label={`Evidence for ${row.company}`}>
      <div className={styles.evidenceSource}><Icon name="document" size={13} /><span>{row.company} · {row.source}</span></div>
      <p>“{row.evidence}”</p>
      <span className={styles.evidenceCaption}>Source attached to this cell</span>
    </aside>
  )
}

/** Template content only: its host owns window chrome, model composition and playback. */
export default function EnrichWorkspace({ time, compact = false, revision, onReplay, onInspect }) {
  const [selection, setSelection] = useState(null)
  const frame = getEnrichFrame(time)
  const userSelection = selection?.revision === revision && selection?.time <= time ? selection.row : null
  const selectedIndex = userSelection ?? frame.selected
  const selectedRow = frame.rows[selectedIndex]
  const showEvidence = userSelection !== null && selectedRow.status === 'complete' ? 1 : frame.evidence
  const inspect = (row) => {
    setSelection({ row, revision, time })
    onInspect?.()
  }
  const replay = () => {
    setSelection(null)
    onReplay()
  }

  return (
    <div className={`${styles.workspace} ${compact ? styles.compact : ''}`} data-template="enrichment">
      <header className={styles.header}>
        <div><h3>A spreadsheet that thinks</h3><p>Spreadsheet template</p></div>
        <button type="button" className={styles.enrichButton} onClick={replay} style={{ transform: frame.pressed ? 'translateY(1px)' : undefined }} aria-label="Replay row enrichment illustration"><span>Enrich rows</span><Icon name="arrow" size={12} />{!compact && <Cursor x={28 - 105 * (1 - frame.cursor)} y={12 + 200 * (1 - frame.cursor)} visible={frame.cursorVisible} pressed={frame.pressed} />}</button>
      </header>
      <table className={styles.table} aria-label="Fictional prospect records enriched from local sources">
        <thead><tr><th aria-label="Row number" /><th>Company</th><th className={styles.extraColumn}>Sector</th><th className={styles.extraColumn}>Fit</th><th>Signal</th></tr></thead>
        <tbody>{frame.rows.map((row, index) => (
          <tr key={row.id} data-status={row.status}>
            <td className={styles.rowNumber}>{row.id}</td>
            <td><span>{row.company}</span><small className={styles.mobileDetails}>{row.status === 'complete' ? `${row.sector} · ${row.fit}` : 'Local source'}</small></td>
            <td className={styles.extraColumn}><span className={styles.reveal} style={{ opacity: row.status === 'complete' ? row.reveal : 0.35 }}>{row.status === 'complete' ? row.sector : '—'}</span></td>
            <td className={styles.extraColumn}><span style={{ opacity: row.status === 'complete' ? row.reveal : 0.35 }}>{row.status === 'complete' ? row.fit : '—'}</span></td>
            <td className={styles.signalCell} data-selected={selectedIndex === index}>
              <button type="button" className={styles.cellButton} disabled={row.status !== 'complete'} aria-pressed={selectedIndex === index} onClick={() => inspect(index)} aria-label={`Inspect evidence for ${row.company}`}>
                {row.status === 'complete' ? <span className={styles.cellResult} style={{ opacity: row.reveal, transform: `translateY(${5 * (1 - row.reveal)}px)` }}><Icon name="check" size={11} /><span>{row.signal}<span className={styles.cellArrow}>↗</span></span></span> : <span className={row.status === 'reading' ? styles.reading : styles.queued}>{row.status === 'reading' ? 'Reading evidence…' : 'Queued'}</span>}
              </button>
            </td>
          </tr>
        ))}</tbody>
      </table>
      <div className={styles.evidenceArea}>{showEvidence > 0 && <Evidence row={selectedRow} opacity={showEvidence} />}</div>
      <footer className={styles.footer}><span className={styles.progress} data-active={frame.enriching}>{frame.completed === 4 && <Icon name="check" size={11} />}{frame.completed} of 4 rows enriched</span><span>Sample data · Local sources</span></footer>
    </div>
  )
}
