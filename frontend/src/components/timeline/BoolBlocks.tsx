import type { Keyframe } from "@/types/timeliner"
import { timeToX } from "@/lib/timeline-utils"

interface BoolBlocksProps {
  keyframes: Keyframe[]
  pixelsPerSecond: number
  trackHeight: number
  duration: number
}

export function BoolBlocks({
  keyframes,
  pixelsPerSecond,
  trackHeight,
  duration,
}: BoolBlocksProps) {
  const blocks: Array<{ x1: number; x2: number }> = []

  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].value === true) {
      const startX = timeToX(keyframes[i].time, pixelsPerSecond)
      const endTime =
        i + 1 < keyframes.length ? keyframes[i + 1].time : duration
      const endX = timeToX(endTime, pixelsPerSecond)
      blocks.push({ x1: startX, x2: endX })
    }
  }

  return (
    <>
      {blocks.map((block, i) => (
        <rect
          key={i}
          x={block.x1}
          y={trackHeight * 0.2}
          width={block.x2 - block.x1}
          height={trackHeight * 0.6}
          fill="var(--chart-2)"
          opacity={0.5}
          rx={2}
        />
      ))}
    </>
  )
}
