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

  const stops: { offset: number; color: string }[] = []
  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i]
    const offset = ((timeToX(kf.time, pixelsPerSecond) - firstX) / width) * 100
    stops.push({ offset, color: String(kf.value) })

    // For step interpolation, hold this color flat until just before the next keyframe
    if (kf.interpolation === "step" && i < keyframes.length - 1) {
      const nextOffset =
        ((timeToX(keyframes[i + 1].time, pixelsPerSecond) - firstX) / width) * 100
      stops.push({ offset: nextOffset, color: String(kf.value) })
    }
  }

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
