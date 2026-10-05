import { useEffect, useState } from 'react'
import { Cursor } from '../../components'
import { lerp } from '../../motion/math'

/** Measure native cell/button targets so the same gestures fit desktop and mobile. */
function useCursorTargets(workspaceRef) {
  const [targets, setTargets] = useState(null)
  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return
    const elements = [...workspace.querySelectorAll('[data-enrich-target]')]
    const measure = () => {
      const bounds = workspace.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const scaleX = workspace.clientWidth / bounds.width
      const scaleY = workspace.clientHeight / bounds.height
      const next = Object.fromEntries(elements.map(element => {
        const rect = element.getBoundingClientRect()
        return [element.dataset.enrichTarget, {
          x: (rect.left + rect.width / 2 - bounds.left) * scaleX - 2,
          y: (rect.top + rect.height / 2 - bounds.top) * scaleY - 2,
        }]
      }))
      next.entry = { x: next['cell-0'].x - 35, y: next['cell-0'].y + 28 }
      setTargets(previous => previous && Object.entries(next).every(([key, point]) =>
        Math.abs(previous[key]?.x - point.x) < .01 && Math.abs(previous[key]?.y - point.y) < .01,
      ) ? previous : next)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(workspace)
    elements.forEach(element => observer.observe(element))
    window.addEventListener('resize', measure)
    return () => { observer.disconnect(); window.removeEventListener('resize', measure) }
  }, [workspaceRef])
  return targets
}

export default function EnrichCursor({ frame, workspaceRef }) {
  const targets = useCursorTargets(workspaceRef)
  if (!frame.cursorVisible || !targets) return null
  const { from, to, progress } = frame.cursorCue
  return <Cursor x={lerp(targets[from].x, targets[to].x, progress)} y={lerp(targets[from].y, targets[to].y, progress)} pressed={frame.pressed} />
}
