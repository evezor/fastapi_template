import { useCallback } from "react"
import { useTimelineStore } from "@/store/timeline-store"
import { timeToX, xToTime, generateRulerTicks } from "@/lib/timeline-utils"

interface TimelineRulerProps {
  viewportWidth: number
}

export function TimelineRuler({ viewportWidth }: TimelineRulerProps) {
  const project = useTimelineStore((s) => s.project)
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond)
  const scrollLeft = useTimelineStore((s) => s.scrollLeft)
  const rulerHeight = useTimelineStore((s) => s.rulerHeight)
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime)
  const currentTime = useTimelineStore((s) => s.currentTime)
  const zoomAtPoint = useTimelineStore((s) => s.zoomAtPoint)
  const setScrollLeft = useTimelineStore((s) => s.setScrollLeft)

  const ticks = generateRulerTicks(
    project.duration,
    pixelsPerSecond,
    viewportWidth,
    scrollLeft,
    project.timeMode,
    project.fps
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()

      const updateTime = (clientX: number) => {
        const x = clientX - rect.left + scrollLeft
        const time = xToTime(x, pixelsPerSecond)
        setCurrentTime(time)
      }

      updateTime(e.clientX)

      const handleMouseMove = (ev: MouseEvent) => updateTime(ev.clientX)
      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    },
    [scrollLeft, pixelsPerSecond, setCurrentTime]
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const rect = e.currentTarget.getBoundingClientRect()
        const pivotX = e.clientX - rect.left
        const delta = -e.deltaY * 0.002
        zoomAtPoint(delta, pivotX)
      } else if (e.shiftKey) {
        setScrollLeft(scrollLeft + e.deltaY)
      } else {
        setScrollLeft(scrollLeft + e.deltaX)
      }
    },
    [scrollLeft, zoomAtPoint, setScrollLeft]
  )

  const playheadX = timeToX(currentTime, pixelsPerSecond) - scrollLeft

  return (
    <svg
      width={viewportWidth}
      height={rulerHeight}
      className="bg-card border-b border-border cursor-pointer select-none shrink-0"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      <g transform={`translate(${-scrollLeft}, 0)`}>
        {ticks.map((tick, i) => {
          const x = timeToX(tick.time, pixelsPerSecond)
          return (
            <g key={i}>
              <line
                x1={x}
                y1={tick.isMajor ? 0 : rulerHeight * 0.6}
                x2={x}
                y2={rulerHeight}
                stroke="var(--border)"
                strokeWidth={tick.isMajor ? 1 : 0.5}
              />
              {tick.isMajor && (
                <text
                  x={x + 4}
                  y={14}
                  fill="var(--muted-foreground)"
                  fontSize={11}
                  fontFamily="monospace"
                >
                  {tick.label}
                </text>
              )}
            </g>
          )
        })}
      </g>

      {/* Playhead indicator on ruler */}
      {playheadX >= 0 && playheadX <= viewportWidth && (
        <g>
          <polygon
            points={`${playheadX - 6},0 ${playheadX + 6},0 ${playheadX},10`}
            fill="var(--primary)"
          />
          <line
            x1={playheadX}
            y1={10}
            x2={playheadX}
            y2={rulerHeight}
            stroke="var(--primary)"
            strokeWidth={1}
          />
        </g>
      )}
    </svg>
  )
}
