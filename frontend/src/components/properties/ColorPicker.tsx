import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// --- Color conversion utilities ---

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  )
}

function rgbToHsv(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)]
}

function hsvToRgb(
  h: number,
  s: number,
  v: number
): [number, number, number] {
  h /= 360
  s /= 100
  v /= 100
  let r = 0,
    g = 0,
    b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

// --- Picker mode type ---

type PickerMode = "rgb" | "hsv" | "wheel"

// --- Slider component for color channels ---

function ColorSlider({
  label,
  value,
  max,
  gradient,
  onChange,
}: {
  label: string
  value: number
  max: number
  gradient: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold text-muted-foreground w-3 shrink-0">
        {label}
      </span>
      <div className="relative flex-1 h-4">
        <div
          className="absolute inset-0 rounded-sm border border-border"
          style={{ background: gradient }}
        />
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-4 rounded-sm border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)] pointer-events-none"
          style={{ left: `calc(${(value / max) * 100}% - 5px)` }}
        />
      </div>
      <Input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (!isNaN(v)) onChange(Math.max(0, Math.min(max, v)))
        }}
        className="h-5 w-10 text-[10px] font-mono px-1 text-center"
      />
    </div>
  )
}

// --- Color Wheel picker ---

function WheelPicker({
  hex,
  onChange,
}: {
  hex: string
  onChange: (hex: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rgb] = [hexToRgb(hex)]
  const [h, s, v] = rgbToHsv(...rgb)
  const isDraggingWheel = useRef(false)
  const isDraggingValue = useRef(false)
  const wheelSize = 140
  const radius = wheelSize / 2
  const innerRadius = radius - 8

  // Draw the color wheel
  const drawWheel = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const cx = radius
      const cy = radius

      // Draw hue/saturation wheel
      for (let angle = 0; angle < 360; angle++) {
        const startAngle = ((angle - 1) * Math.PI) / 180
        const endAngle = ((angle + 1) * Math.PI) / 180

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius)
        const [r1, g1, b1] = hsvToRgb(angle, 0, v)
        const [r2, g2, b2] = hsvToRgb(angle, 100, v)
        gradient.addColorStop(0, `rgb(${r1},${g1},${b1})`)
        gradient.addColorStop(1, `rgb(${r2},${g2},${b2})`)

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, innerRadius, startAngle, endAngle)
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()
      }

      // Clip to circle
      ctx.globalCompositeOperation = "destination-in"
      ctx.beginPath()
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = "source-over"

      // Draw marker
      const markerAngle = (h * Math.PI) / 180
      const markerDist = (s / 100) * innerRadius
      const mx = cx + Math.cos(markerAngle) * markerDist
      const my = cy + Math.sin(markerAngle) * markerDist

      ctx.beginPath()
      ctx.arc(mx, my, 5, 0, Math.PI * 2)
      ctx.strokeStyle = "white"
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(mx, my, 5, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(0,0,0,0.3)"
      ctx.lineWidth = 1
      ctx.stroke()
    },
    [h, s, v, radius, innerRadius]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, wheelSize, wheelSize)
    drawWheel(ctx)
  }, [drawWheel, wheelSize])

  const handleWheelInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left - radius
      const y = clientY - rect.top - radius
      const dist = Math.sqrt(x * x + y * y)
      const clampedDist = Math.min(dist, innerRadius)
      let angle = (Math.atan2(y, x) * 180) / Math.PI
      if (angle < 0) angle += 360
      const newS = Math.round((clampedDist / innerRadius) * 100)
      const newH = Math.round(angle)
      const [r, g, b] = hsvToRgb(newH, newS, v)
      onChange(rgbToHex(r, g, b))
    },
    [radius, innerRadius, v, onChange]
  )

  const handleValueChange = useCallback(
    (newV: number) => {
      const [r, g, b] = hsvToRgb(h, s, newV)
      onChange(rgbToHex(r, g, b))
    },
    [h, s, onChange]
  )

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (isDraggingWheel.current) handleWheelInteraction(e.clientX, e.clientY)
    }
    const handleUp = () => {
      isDraggingWheel.current = false
      isDraggingValue.current = false
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    return () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
  }, [handleWheelInteraction])

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        <canvas
          ref={canvasRef}
          width={wheelSize}
          height={wheelSize}
          className="rounded-full cursor-crosshair shrink-0"
          style={{ width: wheelSize, height: wheelSize }}
          onPointerDown={(e) => {
            isDraggingWheel.current = true
            handleWheelInteraction(e.clientX, e.clientY)
          }}
        />
        {/* Value bar */}
        <div className="flex flex-col items-center gap-1 h-[140px]">
          <span className="text-[10px] font-semibold text-muted-foreground">V</span>
          <div className="relative flex-1 w-4">
            <div
              className="absolute inset-0 rounded-sm border border-border"
              style={{
                background: `linear-gradient(to bottom, ${rgbToHex(...hsvToRgb(h, s, 100))}, #000)`,
              }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={v}
              onChange={(e) => handleValueChange(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{
                writingMode: "vertical-lr",
                direction: "rtl",
              }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 h-2.5 w-4 rounded-sm border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)] pointer-events-none"
              style={{ top: `calc(${(1 - v / 100) * 100}% - 5px)` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main ColorPicker component ---

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [mode, setMode] = useState<PickerMode>("rgb")
  const hex = String(value)
  const [r, g, b] = hexToRgb(hex)
  const [h, s, v] = rgbToHsv(r, g, b)

  const modes: { key: PickerMode; label: string }[] = [
    { key: "rgb", label: "RGB" },
    { key: "hsv", label: "HSV" },
    { key: "wheel", label: "Wheel" },
  ]

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Color</Label>

      {/* Preview swatch + hex input */}
      <div className="flex gap-2 items-center">
        <div
          className="w-8 h-7 rounded border border-border shrink-0"
          style={{ backgroundColor: hex }}
        />
        <Input
          value={hex}
          onChange={(e) => {
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
              onChange(e.target.value)
            }
          }}
          className="h-7 text-xs font-mono flex-1"
          placeholder="#ff0000"
        />
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-md border border-border overflow-hidden">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 text-[10px] font-semibold py-1 transition-colors ${
              mode === m.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* RGB Sliders */}
      {mode === "rgb" && (
        <div className="space-y-1.5">
          <ColorSlider
            label="R"
            value={r}
            max={255}
            gradient={`linear-gradient(to right, ${rgbToHex(0, g, b)}, ${rgbToHex(255, g, b)})`}
            onChange={(newR) => onChange(rgbToHex(newR, g, b))}
          />
          <ColorSlider
            label="G"
            value={g}
            max={255}
            gradient={`linear-gradient(to right, ${rgbToHex(r, 0, b)}, ${rgbToHex(r, 255, b)})`}
            onChange={(newG) => onChange(rgbToHex(r, newG, b))}
          />
          <ColorSlider
            label="B"
            value={b}
            max={255}
            gradient={`linear-gradient(to right, ${rgbToHex(r, g, 0)}, ${rgbToHex(r, g, 255)})`}
            onChange={(newB) => onChange(rgbToHex(r, g, newB))}
          />
        </div>
      )}

      {/* HSV Sliders */}
      {mode === "hsv" && (
        <div className="space-y-1.5">
          <ColorSlider
            label="H"
            value={h}
            max={360}
            gradient="linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
            onChange={(newH) => {
              const [nr, ng, nb] = hsvToRgb(newH, s, v)
              onChange(rgbToHex(nr, ng, nb))
            }}
          />
          <ColorSlider
            label="S"
            value={s}
            max={100}
            gradient={`linear-gradient(to right, ${rgbToHex(...hsvToRgb(h, 0, v))}, ${rgbToHex(...hsvToRgb(h, 100, v))})`}
            onChange={(newS) => {
              const [nr, ng, nb] = hsvToRgb(h, newS, v)
              onChange(rgbToHex(nr, ng, nb))
            }}
          />
          <ColorSlider
            label="V"
            value={v}
            max={100}
            gradient={`linear-gradient(to right, ${rgbToHex(...hsvToRgb(h, s, 0))}, ${rgbToHex(...hsvToRgb(h, s, 100))})`}
            onChange={(newV) => {
              const [nr, ng, nb] = hsvToRgb(h, s, newV)
              onChange(rgbToHex(nr, ng, nb))
            }}
          />
        </div>
      )}

      {/* Color Wheel */}
      {mode === "wheel" && <WheelPicker hex={hex} onChange={onChange} />}
    </div>
  )
}
