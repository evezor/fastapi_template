import type { Channel } from "@/types/timeliner"
import { timeToX, xToTime, interpolationPath } from "@/lib/timeline-utils"
import { KeyframeMarker } from "./KeyframeMarker"
import { BoolBlocks } from "./BoolBlocks"
import { ColorGradient } from "./ColorGradient"
import { useTimelineStore } from "@/store/timeline-store"

interface TimelineTrackProps {
  channel: Channel
  y: number
  trackHeight: number
  pixelsPerSecond: number
  totalWidth: number
}

export function TimelineTrack({
  channel,
  y,
  trackHeight,
  pixelsPerSecond,
  totalWidth,
}: TimelineTrackProps) {
  const selectedChannelId = useTimelineStore((s) => s.selectedChannelId)
  const duration = useTimelineStore((s) => s.project.duration)
  const selectChannel = useTimelineStore((s) => s.selectChannel)
  const addKeyframe = useTimelineStore((s) => s.addKeyframe)
  const isSelected = selectedChannelId === channel.id

  const handleDoubleClick = (e: React.MouseEvent<SVGRectElement>) => {
    // Get click position relative to the SVG coordinate system
    const svg = (e.target as SVGElement).ownerSVGElement
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    // svgPt.x is in viewport space; we need to add scrollLeft back
    const scrollLeft = useTimelineStore.getState().scrollLeft
    const time = xToTime(svgPt.x + scrollLeft, pixelsPerSecond)
    addKeyframe(channel.id, time)
  }

  // Interpolation line for float/int channels
  const valuePath =
    (channel.type === "float" || channel.type === "int") &&
    channel.keyframes.length >= 2
      ? interpolationPath(
          channel.keyframes,
          channel.type,
          pixelsPerSecond,
          trackHeight,
          channel.config.min ?? 0,
          channel.config.max ?? 1
        )
      : ""

  return (
    <g transform={`translate(0, ${y})`}>
      {/* Lane background */}
      <rect
        x={0}
        y={0}
        width={totalWidth}
        height={trackHeight}
        fill={isSelected ? "var(--accent)" : "transparent"}
        opacity={isSelected ? 0.4 : 1}
        onClick={() => selectChannel(channel.id)}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: "pointer" }}
      />
      {/* Bottom border */}
      <line
        x1={0}
        y1={trackHeight}
        x2={totalWidth}
        y2={trackHeight}
        stroke="var(--border)"
        strokeOpacity={0.3}
      />
      {/* Interpolation visualization */}
      {valuePath && (
        <path
          d={valuePath}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          className="pointer-events-none"
        />
      )}
      {/* Color gradient */}
      {channel.type === "color" && channel.keyframes.length >= 2 && (
        <ColorGradient
          channelId={channel.id}
          keyframes={channel.keyframes}
          pixelsPerSecond={pixelsPerSecond}
          trackHeight={trackHeight}
        />
      )}
      {/* Bool blocks */}
      {channel.type === "bool" && (
        <BoolBlocks
          keyframes={channel.keyframes}
          pixelsPerSecond={pixelsPerSecond}
          trackHeight={trackHeight}
          duration={duration}
        />
      )}
      {/* Keyframes */}
      {channel.keyframes.map((kf, index) => (
        <KeyframeMarker
          key={index}
          keyframe={kf}
          index={index}
          channelId={channel.id}
          channelType={channel.type}
          x={timeToX(kf.time, pixelsPerSecond)}
          trackHeight={trackHeight}
        />
      ))}
    </g>
  )
}
