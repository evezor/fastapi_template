import { Separator } from "@/components/ui/separator"
import { useTimelineStore } from "@/store/timeline-store"

export function StatusBar() {
  const fps = useTimelineStore((s) => s.project.fps)
  const timeMode = useTimelineStore((s) => s.project.timeMode)
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond)
  const isPlaying = useTimelineStore((s) => s.isPlaying)
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed)
  const loopMode = useTimelineStore((s) => s.loopMode)

  const zoomDisplay = `${(pixelsPerSecond / 80).toFixed(1)}x`

  return (
    <div className="flex items-center h-7 px-4 border-t border-border bg-card text-xs text-muted-foreground">
      {isPlaying ? (
        <span className="text-primary font-medium">
          Playing {playbackSpeed !== 1 ? `(${playbackSpeed}x)` : ""}
        </span>
      ) : (
        <span>Stopped</span>
      )}
      <Separator orientation="vertical" className="mx-3 h-3" />
      {loopMode === "loop" && (
        <>
          <span>Loop</span>
          <Separator orientation="vertical" className="mx-3 h-3" />
        </>
      )}
      <span>FPS: {fps}</span>
      <Separator orientation="vertical" className="mx-3 h-3" />
      <span>Time mode: {timeMode.charAt(0).toUpperCase() + timeMode.slice(1)}</span>
      <Separator orientation="vertical" className="mx-3 h-3" />
      <span>Zoom: {zoomDisplay}</span>
      <div className="flex-1" />
      <span>Timeliner v0.1</span>
    </div>
  )
}
