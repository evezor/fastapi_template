import { useCallback } from "react"
import { useTimelineStore } from "@/store/timeline-store"
import { TimelineTracksSVG } from "./TimelineTracksSVG"

interface TimelineTracksViewportProps {
  viewportWidth: number
  viewportHeight: number
}

export function TimelineTracksViewport({
  viewportWidth,
  viewportHeight,
}: TimelineTracksViewportProps) {
  const scrollLeft = useTimelineStore((s) => s.scrollLeft)
  const scrollTop = useTimelineStore((s) => s.scrollTop)
  const setScrollLeft = useTimelineStore((s) => s.setScrollLeft)
  const setScrollTop = useTimelineStore((s) => s.setScrollTop)
  const zoomAtPoint = useTimelineStore((s) => s.zoomAtPoint)

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const rect = e.currentTarget.getBoundingClientRect()
        const pivotX = e.clientX - rect.left
        const delta = -e.deltaY * 0.002
        zoomAtPoint(delta, pivotX)
      } else if (e.shiftKey) {
        // Horizontal scroll via Shift+wheel
        setScrollLeft(scrollLeft + e.deltaY)
      } else {
        // Normal scroll: vertical + horizontal
        setScrollTop(scrollTop + e.deltaY)
        if (e.deltaX !== 0) {
          setScrollLeft(scrollLeft + e.deltaX)
        }
      }
    },
    [scrollLeft, scrollTop, setScrollLeft, setScrollTop, zoomAtPoint]
  )

  return (
    <div className="flex-1 overflow-hidden" onWheel={handleWheel}>
      <TimelineTracksSVG
        viewportWidth={viewportWidth}
        viewportHeight={viewportHeight}
      />
    </div>
  )
}
