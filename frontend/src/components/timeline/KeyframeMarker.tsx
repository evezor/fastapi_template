import { useCallback, useRef } from "react"
import type { Keyframe } from "@/types/timeliner"
import { useTimelineStore } from "@/store/timeline-store"

interface KeyframeMarkerProps {
  keyframe: Keyframe
  index: number
  channelId: string
  channelType: "bool" | "float" | "int" | "color"
  x: number
  trackHeight: number
}

export function KeyframeMarker({
  keyframe,
  index,
  channelId,
  channelType,
  x,
  trackHeight,
}: KeyframeMarkerProps) {
  const selectedChannelId = useTimelineStore((s) => s.selectedChannelId)
  const selectedKeyframeIndex = useTimelineStore((s) => s.selectedKeyframeIndex)
  const selectKeyframe = useTimelineStore((s) => s.selectKeyframe)
  const moveKeyframe = useTimelineStore((s) => s.moveKeyframe)
  const setDraggingKeyframe = useTimelineStore((s) => s.setDraggingKeyframe)

  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const originalTime = useRef(0)

  const isSelected =
    selectedChannelId === channelId && selectedKeyframeIndex === index
  const cy = trackHeight / 2
  const size = 6

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      selectKeyframe(channelId, index)

      // Start drag tracking
      isDragging.current = false
      dragStartX.current = e.clientX
      originalTime.current = keyframe.time

      const svg = (e.target as SVGElement).ownerSVGElement
      if (!svg) return

      const pixelsPerSecond = useTimelineStore.getState().pixelsPerSecond

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - dragStartX.current
        // Only start dragging after 3px threshold
        if (!isDragging.current && Math.abs(deltaX) < 3) return
        if (!isDragging.current) {
          isDragging.current = true
          setDraggingKeyframe(true)
        }

        const deltaTime = deltaX / pixelsPerSecond
        const newTime = originalTime.current + deltaTime
        moveKeyframe(channelId, index, newTime)
      }

      const handlePointerUp = () => {
        if (isDragging.current) {
          setDraggingKeyframe(false)
        }
        isDragging.current = false
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", handlePointerUp)
      }

      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", handlePointerUp)
    },
    [channelId, index, keyframe.time, selectKeyframe, moveKeyframe, setDraggingKeyframe]
  )

  if (channelType === "bool") {
    // For bool, show a small toggle indicator instead of hiding completely
    const fillColor = keyframe.value ? "var(--chart-2)" : "var(--muted-foreground)"
    return (
      <g onPointerDown={handlePointerDown} style={{ cursor: "grab" }}>
        <rect
          x={x - size * 2}
          y={cy - size * 2}
          width={size * 4}
          height={size * 4}
          fill="transparent"
        />
        <rect
          x={x - 3}
          y={cy - 5}
          width={6}
          height={10}
          rx={1}
          fill={fillColor}
          stroke={isSelected ? "var(--primary-foreground)" : "none"}
          strokeWidth={isSelected ? 1.5 : 0}
        />
      </g>
    )
  }

  const fill =
    channelType === "color"
      ? String(keyframe.value)
      : isSelected
        ? "var(--primary)"
        : "var(--muted-foreground)"

  const stroke = isSelected ? "var(--primary-foreground)" : "none"
  const strokeWidth = isSelected ? 1.5 : 0

  let shape: React.ReactNode
  switch (keyframe.interpolation) {
    case "step":
      // Square — hard/blocky feel for hard transitions
      shape = (
        <rect
          x={x - size}
          y={cy - size}
          width={size * 2}
          height={size * 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )
      break
    case "linear":
    default:
      // Diamond — standard interpolation
      shape = (
        <polygon
          points={`${x},${cy - size} ${x + size},${cy} ${x},${cy + size} ${x - size},${cy}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )
      break
  }

  return (
    <g onPointerDown={handlePointerDown} style={{ cursor: "grab" }}>
      {/* Hit area */}
      <rect
        x={x - size * 2}
        y={cy - size * 2}
        width={size * 4}
        height={size * 4}
        fill="transparent"
      />
      {shape}
    </g>
  )
}
