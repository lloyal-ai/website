import { useRef, useState } from 'react'
import { DocsLink, Icon } from '../../components'
import EnrichCursor from './EnrichCursor'
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

const stageLabels = { idle: '—', researching: 'Researching', synthesizing: 'Synthesizing', enriched: 'Enriched' }

function CellContent({ row }) {
  if (row.status === 'complete') return <span className={styles.cellResult}><Icon name="check" size={11} /><span style={{ opacity: row.reveal, transform: `translateY(${5 * (1 - row.reveal)}px)` }}>{row.summary}<span className={styles.cellArrow}>↗</span></span></span>
  if (row.status === 'enriched') return <span className={styles.cellResult}><Icon name="check" size={11} /><span>Enriched</span></span>
  const working = row.status === 'researching' || row.status === 'synthesizing'
  return <span className={working ? styles.working : styles.idle}>{working && <i className={styles.spinner} aria-hidden="true" style={{ transform: `rotate(${row.spinnerAngle}deg)` }} />}{stageLabels[row.status]}</span>
}

/** Template content only: its host owns window chrome, model composition and playback. */
export default function EnrichWorkspace({ time, compact = false, revision, onReplay, onInspect }) {
  const workspaceRef = useRef(null)
  const [selection, setSelection] = useState(null)
  const frame = getEnrichFrame(time)
  const userSelection = selection?.revision === revision && selection?.time <= time ? selection.row : null
  const selectedIndex = userSelection ?? frame.selected
  const selectedRow = frame.rows[selectedIndex]
  const showEvidence = userSelection !== null && selectedRow.status === 'complete' ? 1 : frame.evidence
  const range = time < 12.5 && userSelection === null ? frame.selectedRows : []
  const inspect = (row) => {
    setSelection({ row, revision, time })
    onInspect?.()
  }
  const replay = () => {
    setSelection(null)
    onReplay()
  }

  return (
    <div ref={workspaceRef} className={`${styles.workspace} ${compact ? styles.compact : ''}`} data-template="enrichment" data-selection-phase={frame.selectionPhase}>
      <header className={styles.header}>
        <div><h3>A spreadsheet that thinks</h3><p>Spreadsheet template · <DocsLink href="https://docs.lloyal.ai/agents#orchestrators">Orchestrators</DocsLink></p></div>
        <button type="button" className={styles.enrichButton} data-enrich-target="enrich" onClick={replay} style={{ transform: frame.buttonPressed ? 'translateY(1px)' : undefined }} aria-label="Replay selected-row enrichment illustration"><span>Enrich rows</span><Icon name="arrow" size={12} /></button>
      </header>
      <table className={styles.table} aria-label="Fictional prospect records enriched from local sources">
        <thead><tr><th aria-label="Row number" /><th>Company</th><th className={styles.extraColumn}>Sector</th><th className={styles.extraColumn}>Fit</th><th>Summary</th></tr></thead>
        <tbody>{frame.rows.map((row, index) => (
          <tr key={row.id} data-status={row.status}>
            <td className={styles.rowNumber}>{row.id}</td>
            <td><span>{row.company}</span><small className={styles.mobileDetails}>{row.status === 'complete' ? `${row.sector} · ${row.fit}` : 'Local source'}</small></td>
            <td className={styles.extraColumn}><span className={styles.reveal} style={{ opacity: row.status === 'complete' ? row.reveal : 0.35 }}>{row.status === 'complete' ? row.sector : '—'}</span></td>
            <td className={styles.extraColumn}><span style={{ opacity: row.status === 'complete' ? row.reveal : 0.35 }}>{row.status === 'complete' ? row.fit : '—'}</span></td>
            <td className={styles.summaryCell} data-enrich-target={`cell-${index}`} data-range={range.includes(index)} data-range-start={range[0] === index} data-range-end={range.at(-1) === index} data-selected={showEvidence > 0 && selectedIndex === index}>
              <button type="button" className={styles.cellButton} disabled={row.status !== 'complete'} aria-pressed={row.status === 'complete' ? showEvidence > 0 && selectedIndex === index : undefined} onClick={() => inspect(index)} aria-label={row.status === 'complete' ? `Inspect evidence for ${row.company}` : `${row.company}: ${stageLabels[row.status]}${range.includes(index) ? ', selected' : ''}`}>
                <CellContent row={row} />
              </button>
            </td>
          </tr>
        ))}</tbody>
      </table>
      <div className={styles.evidenceArea}>{showEvidence > 0 && <Evidence row={selectedRow} opacity={showEvidence} />}</div>
      <footer className={styles.footer}><span className={styles.progress} data-active={frame.enriching}>{frame.completed === frame.totalSelected && <Icon name="check" size={11} />}{frame.selectionPhase === 'idle' ? 'Select cells to enrich' : ['selecting', 'selected'].includes(frame.selectionPhase) ? `${frame.selectedRows.length} cells selected` : `${frame.completed} of ${frame.totalSelected} rows enriched`}</span><span>Sample data · Local sources</span></footer>
      <EnrichCursor frame={frame} workspaceRef={workspaceRef} />
    </div>
  )
}
