import { useTimelineStore } from "@/store/timeline-store"
import { timeToX, timelineWidth, generateRulerTicks } from "@/lib/timeline-utils"
import { TimelineTrack } from "./TimelineTrack"

interface TimelineTracksSVGProps {
  viewportWidth: number
  viewportHeight: number
}

export function TimelineTracksSVG({
  viewportWidth,
  viewportHeight,
}: TimelineTracksSVGProps) {
  const channels = useTimelineStore((s) => s.channels)
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond)
  const scrollLeft = useTimelineStore((s) => s.scrollLeft)
  const scrollTop = useTimelineStore((s) => s.scrollTop)
  const project = useTimelineStore((s) => s.project)
  const trackHeight = useTimelineStore((s) => s.trackHeight)
  const currentTime = useTimelineStore((s) => s.currentTime)

  const totalWidth = timelineWidth(project.duration, pixelsPerSecond)
  const totalHeight = channels.length * trackHeight

  // Virtual rendering: only render visible tracks
  const firstVisible = Math.max(0, Math.floor(scrollTop / trackHeight) - 1)
  const lastVisible = Math.min(
    channels.length - 1,
    Math.ceil((scrollTop + viewportHeight) / trackHeight)
  )
  const visibleChannels = channels.slice(firstVisible, lastVisible + 1)

  // Grid lines (reuse ruler tick positions)
  const ticks = generateRulerTicks(
    project.duration,
    pixelsPerSecond,
    viewportWidth,
    scrollLeft,
    project.timeMode,
    project.fps
  )

  // Playhead position in viewport space
  const playheadX = timeToX(currentTime, pixelsPerSecond) - scrollLeft

  return (
    <svg
      width={viewportWidth}
      height={viewportHeight}
      style={{ display: "block" }}
    >
      <defs>
        <clipPath id="tracks-clip">
          <rect x={0} y={0} width={viewportWidth} height={viewportHeight} />
        </clipPath>
      </defs>

      <g clipPath="url(#tracks-clip)">
        <g transform={`translate(${-scrollLeft}, ${-scrollTop})`}>
          {/* Vertical grid lines */}
          {ticks
            .filter((t) => t.isMajor)
            .map((tick, i) => {
              const x = timeToX(tick.time, pixelsPerSecond)
              return (
                <line
                  key={i}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={Math.max(totalHeight, viewportHeight + scrollTop)}
                  stroke="var(--border)"
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />
              )
            })}

          {/* Track lanes */}
          {visibleChannels.map((channel, i) => (
            <TimelineTrack
              key={channel.id}
              channel={channel}
              y={(firstVisible + i) * trackHeight}
              trackHeight={trackHeight}
              pixelsPerSecond={pixelsPerSecond}
              totalWidth={totalWidth}
            />
          ))}
        </g>

        {/* Playhead (in viewport space, not scrolled) */}
        {playheadX >= 0 && playheadX <= viewportWidth && (
          <line
            x1={playheadX}
            y1={0}
            x2={playheadX}
            y2={viewportHeight}
            stroke="var(--primary)"
            strokeWidth={1}
            className="pointer-events-none"
          />
        )}
      </g>
    </svg>
  )
}
