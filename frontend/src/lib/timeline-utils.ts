import type { Channel, Keyframe } from "@/types/timeliner"

export function timeToX(time: number, pixelsPerSecond: number): number {
  return time * pixelsPerSecond
}

export function xToTime(x: number, pixelsPerSecond: number): number {
  return x / pixelsPerSecond
}

export function timelineWidth(
  duration: number,
  pixelsPerSecond: number
): number {
  return duration * pixelsPerSecond
}

const NICE_INTERVALS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60]

export function generateRulerTicks(
  duration: number,
  pixelsPerSecond: number,
  viewportWidth: number,
  scrollLeft: number,
  timeMode: "seconds" | "frames" | "bpm",
  fps: number
): Array<{ time: number; label: string; isMajor: boolean }> {
  // Pick an interval so major ticks are ~100-150px apart
  const idealInterval = 100 / pixelsPerSecond
  let majorInterval = NICE_INTERVALS[NICE_INTERVALS.length - 1]
  for (const n of NICE_INTERVALS) {
    if (n >= idealInterval) {
      majorInterval = n
      break
    }
  }

  const minorInterval = majorInterval / 5

  // Visible time range with one tick padding on each side
  const startTime = Math.max(0, xToTime(scrollLeft, pixelsPerSecond) - majorInterval)
  const endTime = Math.min(
    duration,
    xToTime(scrollLeft + viewportWidth, pixelsPerSecond) + majorInterval
  )

  const ticks: Array<{ time: number; label: string; isMajor: boolean }> = []

  // Generate minor ticks
  const minorStart = Math.floor(startTime / minorInterval) * minorInterval
  for (let t = minorStart; t <= endTime; t += minorInterval) {
    const time = Math.round(t * 1000) / 1000 // avoid floating-point drift
    if (time < 0 || time > duration) continue

    // Check if this is also a major tick
    const isMajor = Math.abs(time % majorInterval) < 0.001 ||
      Math.abs(time % majorInterval - majorInterval) < 0.001

    ticks.push({
      time,
      label: isMajor ? formatTime(time, timeMode, fps) : "",
      isMajor,
    })
  }

  return ticks
}

export function formatTime(
  time: number,
  timeMode: "seconds" | "frames" | "bpm",
  fps: number
): string {
  switch (timeMode) {
    case "frames":
      return `${Math.round(time * fps)}f`
    case "bpm":
      return `${time.toFixed(2)}b`
    case "seconds":
    default:
      if (time >= 60) {
        const min = Math.floor(time / 60)
        const sec = time % 60
        return `${min}:${sec < 10 ? "0" : ""}${sec.toFixed(1)}`
      }
      return `${time.toFixed(1)}s`
  }
}

// --- Interpolation utilities ---

/** Interpolate a numeric value between two keyframes at a given time */
export function interpolateNumeric(
  kfA: Keyframe,
  kfB: Keyframe,
  time: number
): number {
  const vA = Number(kfA.value)
  const vB = Number(kfB.value)
  if (kfA.interpolation === "step") return vA
  const t = (time - kfA.time) / (kfB.time - kfA.time)
  return vA + (vB - vA) * t
}

/** Generate SVG path points for an interpolated line between keyframes */
export function interpolationPath(
  keyframes: Keyframe[],
  channelType: "float" | "int" | "color" | "bool",
  pixelsPerSecond: number,
  trackHeight: number,
  valueMin: number,
  valueMax: number
): string {
  if (keyframes.length === 0 || channelType === "bool" || channelType === "color")
    return ""

  const padding = trackHeight * 0.15
  const usableHeight = trackHeight - padding * 2
  const range = valueMax - valueMin || 1

  function valueToY(val: number): number {
    const normalized = (val - valueMin) / range
    return trackHeight - padding - normalized * usableHeight
  }

  const points: string[] = []

  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i]
    const x = timeToX(kf.time, pixelsPerSecond)
    const y = valueToY(Number(kf.value))

    if (i === 0) {
      points.push(`M ${x} ${y}`)
    } else {
      const prev = keyframes[i - 1]
      if (prev.interpolation === "step") {
        // Step: horizontal then vertical
        const prevY = valueToY(Number(prev.value))
        points.push(`L ${x} ${prevY}`)
        points.push(`L ${x} ${y}`)
      } else {
        // Linear
        points.push(`L ${x} ${y}`)
      }
    }
  }

  return points.join(" ")
}

/** Parse a hex color string to RGB components */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

/** Convert RGB to hex */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
  )
}

/** Build SVG gradient stop data for color channel interpolation */
export function colorGradientStops(
  keyframes: Keyframe[],
  duration: number
): Array<{ offset: string; color: string }> {
  if (keyframes.length === 0) return []
  return keyframes.map((kf) => ({
    offset: `${(kf.time / duration) * 100}%`,
    color: String(kf.value),
  }))
}

/** Evaluate the computed value of a channel at a given time */
export function evaluateChannelAtTime(
  channel: Channel,
  time: number
): number | boolean | string | null {
  const { keyframes, type } = channel
  if (keyframes.length === 0) return null

  // Before first keyframe
  if (time <= keyframes[0].time) return keyframes[0].value

  // After last keyframe
  if (time >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value
  }

  // Find the two bracketing keyframes
  for (let i = 0; i < keyframes.length - 1; i++) {
    const kfA = keyframes[i]
    const kfB = keyframes[i + 1]
    if (time >= kfA.time && time <= kfB.time) {
      if (type === "bool") {
        return kfA.value // bools are always step
      }
      if (type === "color") {
        if (kfA.interpolation === "step") return kfA.value
        const t = (time - kfA.time) / (kfB.time - kfA.time)
        return interpolateColor(String(kfA.value), String(kfB.value), t)
      }
      // float or int
      const result = interpolateNumeric(kfA, kfB, time)
      return type === "int" ? Math.round(result) : result
    }
  }

  return keyframes[keyframes.length - 1].value
}

/** Interpolate a color between two hex values */
export function interpolateColor(
  colorA: string,
  colorB: string,
  t: number
): string {
  const [rA, gA, bA] = hexToRgb(colorA)
  const [rB, gB, bB] = hexToRgb(colorB)
  return rgbToHex(
    rA + (rB - rA) * t,
    gA + (gB - gA) * t,
    bA + (bB - bA) * t
  )
}
