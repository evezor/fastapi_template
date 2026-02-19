import { useRef, useState, useEffect } from "react"
import { useTimelineStore } from "@/store/timeline-store"
import { TimelineRuler } from "./TimelineRuler"
import { TimelineTracksViewport } from "./TimelineTracksViewport"

export function TimelineArea() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rulerHeight = useTimelineStore((s) => s.rulerHeight)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const tracksHeight = Math.max(0, viewportSize.height - rulerHeight)

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-background">
      {viewportSize.width > 0 && (
        <>
          <TimelineRuler viewportWidth={viewportSize.width} />
          <TimelineTracksViewport
            viewportWidth={viewportSize.width}
            viewportHeight={tracksHeight}
          />
        </>
      )}
    </div>
  )
}
