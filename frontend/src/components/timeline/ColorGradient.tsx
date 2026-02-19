import type { Keyframe } from "@/types/timeliner"
import { timeToX } from "@/lib/timeline-utils"

interface ColorGradientProps {
  channelId: string
  keyframes: Keyframe[]
  pixelsPerSecond: number
  trackHeight: number
}

export function ColorGradient({
  channelId,
  keyframes,
  pixelsPerSecond,
  trackHeight,
}: ColorGradientProps) {
  if (keyframes.length < 2) return null

  const firstX = timeToX(keyframes[0].time, pixelsPerSecond)
  const lastX = timeToX(keyframes[keyframes.length - 1].time, pixelsPerSecond)
  const width = lastX - firstX
  if (width <= 0) return null

  const gradientId = `color-grad-${channelId}`

  const stops = keyframes.map((kf) => ({
    offset: ((timeToX(kf.time, pixelsPerSecond) - firstX) / width) * 100,
    color: String(kf.value),
  }))

  const padding = trackHeight * 0.25

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {stops.map((stop, i) => (
            <stop
              key={i}
              offset={`${stop.offset}%`}
              stopColor={stop.color}
              stopOpacity={0.7}
            />
          ))}
        </linearGradient>
      </defs>
      <rect
        x={firstX}
        y={padding}
        width={width}
        height={trackHeight - padding * 2}
        rx={3}
        fill={`url(#${gradientId})`}
        className="pointer-events-none"
      />
    </>
  )
}
