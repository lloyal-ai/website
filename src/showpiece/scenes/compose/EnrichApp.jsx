import { usePlaybackState, useStageLayout } from '../../playback/ShowpieceContext'
import EnrichWorkspace from '../enrich/EnrichWorkspace'
import { COMPOSITIONS } from './timeline'
import { useComposeFrame, useComposeUi } from './useCompose'

export default function EnrichApp() {
  const { enrich } = useComposeFrame()
  const { playback, reducedMotion } = useComposeUi()
  const { compact } = useStageLayout()
  const { revision } = usePlaybackState()
  const replay = () => {
    const composition = COMPOSITIONS.find(({ id }) => id === 'enrich')
    playback.seek(reducedMotion ? composition.still : composition.start)
    playback.play()
  }

  return <EnrichWorkspace time={enrich.time} compact={compact} revision={revision} onReplay={replay} onInspect={playback.pause} />
}
