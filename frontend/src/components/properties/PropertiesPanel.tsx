import { useState, useCallback } from "react"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTimelineStore } from "@/store/timeline-store"
import { formatTime, evaluateChannelAtTime } from "@/lib/timeline-utils"
import { Trash2 } from "lucide-react"
import { ColorPicker } from "./ColorPicker"

export function PropertiesPanel() {
  const channels = useTimelineStore((s) => s.channels)
  const selectedChannelId = useTimelineStore((s) => s.selectedChannelId)
  const selectedKeyframeIndex = useTimelineStore((s) => s.selectedKeyframeIndex)
  const project = useTimelineStore((s) => s.project)
  const updateKeyframe = useTimelineStore((s) => s.updateKeyframe)
  const deleteKeyframe = useTimelineStore((s) => s.deleteKeyframe)

  const currentTime = useTimelineStore((s) => s.currentTime)

  const channel = channels.find((c) => c.id === selectedChannelId)
  const keyframe =
    channel && selectedKeyframeIndex !== null
      ? channel.keyframes[selectedKeyframeIndex]
      : null

  // Use a key that resets local input state when the selected keyframe changes
  // Note: value is excluded so that editing (e.g. dragging a color slider) doesn't remount the tree
  const editorKey = keyframe
    ? `${selectedChannelId}-${selectedKeyframeIndex}`
    : ""

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center h-10 px-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Properties
        </span>
      </div>

      {channel ? (
        <div className="p-3 space-y-3">
          <PropertyRow label="Name" value={channel.name} />
          <PropertyRow label="Type" value={channel.type} />
          <Separator />
          {keyframe && selectedKeyframeIndex !== null ? (
            <KeyframeEditor
              key={editorKey}
              channelType={channel.type}
              keyframe={keyframe}
              config={channel.config}
              timeMode={project.timeMode}
              fps={project.fps}
              duration={project.duration}
              onUpdate={(updates) =>
                updateKeyframe(channel.id, selectedKeyframeIndex, updates)
              }
              onDelete={() =>
                deleteKeyframe(channel.id, selectedKeyframeIndex)
              }
            />
          ) : (
            <ChannelLiveValue channel={channel} currentTime={currentTime} />
          )}
        </div>
      ) : (
        <div className="p-3 text-xs text-muted-foreground/50">
          Select a channel or keyframe
        </div>
      )}

      <div className="flex-1" />
    </div>
  )
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  )
}

interface KeyframeEditorProps {
  channelType: "bool" | "float" | "int" | "color"
  keyframe: { time: number; value: number | boolean | string; interpolation: "linear" | "step" }
  config: { min?: number; max?: number }
  timeMode: "seconds" | "frames" | "bpm"
  fps: number
  duration: number
  onUpdate: (updates: Partial<{ time: number; value: number | boolean | string; interpolation: "linear" | "step" }>) => void
  onDelete: () => void
}

function KeyframeEditor({
  channelType,
  keyframe,
  config,
  timeMode,
  fps,
  duration,
  onUpdate,
  onDelete,
}: KeyframeEditorProps) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Keyframe
      </div>

      {/* Time */}
      <TimeInput
        time={keyframe.time}
        timeMode={timeMode}
        fps={fps}
        duration={duration}
        onChange={(t) => onUpdate({ time: t })}
      />

      {/* Value */}
      <ValueInput
        channelType={channelType}
        value={keyframe.value}
        config={config}
        onChange={(v) => onUpdate({ value: v })}
      />

      {/* Interpolation */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Interpolation</Label>
        <Select
          value={keyframe.interpolation}
          onValueChange={(v) =>
            onUpdate({ interpolation: v as "linear" | "step" })
          }
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="step">Step</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Delete */}
      <Button
        variant="destructive"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={onDelete}
      >
        <Trash2 className="w-3 h-3 mr-1" />
        Delete Keyframe
      </Button>
    </div>
  )
}

function TimeInput({
  time,
  timeMode,
  fps,
  duration,
  onChange,
}: {
  time: number
  timeMode: "seconds" | "frames" | "bpm"
  fps: number
  duration: number
  onChange: (time: number) => void
}) {
  const [localValue, setLocalValue] = useState(time.toFixed(3))

  const commit = useCallback(() => {
    const parsed = parseFloat(localValue)
    if (!isNaN(parsed)) {
      onChange(Math.max(0, Math.min(parsed, duration)))
    } else {
      setLocalValue(time.toFixed(3))
    }
  }, [localValue, time, duration, onChange])

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        Time ({formatTime(time, timeMode, fps)})
      </Label>
      <Input
        type="number"
        step="0.1"
        min={0}
        max={duration}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="h-7 text-xs font-mono"
      />
    </div>
  )
}

function ValueInput({
  channelType,
  value,
  config,
  onChange,
}: {
  channelType: "bool" | "float" | "int" | "color"
  value: number | boolean | string
  config: { min?: number; max?: number }
  onChange: (value: number | boolean | string) => void
}) {
  if (channelType === "bool") {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Value</Label>
        <Button
          variant={value ? "default" : "outline"}
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => onChange(!value)}
        >
          {value ? "ON" : "OFF"}
        </Button>
      </div>
    )
  }

  if (channelType === "color") {
    return <ColorPicker value={String(value)} onChange={onChange} />
  }

  // Float or Int
  return (
    <NumericValueInput
      channelType={channelType}
      value={Number(value)}
      min={config.min ?? 0}
      max={config.max ?? 1}
      onChange={onChange}
    />
  )
}

function NumericValueInput({
  channelType,
  value,
  min,
  max,
  onChange,
}: {
  channelType: "float" | "int"
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const [localValue, setLocalValue] = useState(
    channelType === "int" ? String(value) : value.toFixed(3)
  )

  const commit = useCallback(() => {
    const parsed = parseFloat(localValue)
    if (!isNaN(parsed)) {
      let clamped = Math.max(min, Math.min(max, parsed))
      if (channelType === "int") clamped = Math.round(clamped)
      onChange(clamped)
    } else {
      setLocalValue(channelType === "int" ? String(value) : value.toFixed(3))
    }
  }, [localValue, value, min, max, channelType, onChange])

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        Value ({min} — {max})
      </Label>
      <Input
        type="number"
        step={channelType === "int" ? 1 : 0.01}
        min={min}
        max={max}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="h-7 text-xs font-mono"
      />
    </div>
  )
}

function ChannelLiveValue({
  channel,
  currentTime,
}: {
  channel: import("@/types/timeliner").Channel
  currentTime: number
}) {
  const value = evaluateChannelAtTime(channel, currentTime)

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Current Value
      </div>
      {value !== null ? (
        <div className="flex items-center gap-2">
          {channel.type === "color" ? (
            <>
              <div
                className="w-8 h-8 rounded border border-border"
                style={{ backgroundColor: String(value) }}
              />
              <span className="text-sm font-mono">{String(value)}</span>
            </>
          ) : channel.type === "bool" ? (
            <span className={`text-sm font-semibold ${value ? "text-green-400" : "text-muted-foreground"}`}>
              {value ? "ON" : "OFF"}
            </span>
          ) : (
            <span className="text-sm font-mono">
              {channel.type === "float"
                ? (value as number).toFixed(3)
                : String(Math.round(value as number))}
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground/50">No keyframes</span>
      )}
      <p className="text-xs text-muted-foreground/70">
        Double-click a track to add a keyframe
      </p>
    </div>
  )
}
