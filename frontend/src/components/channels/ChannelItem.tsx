import { ChevronRight } from "lucide-react"
import type { Channel } from "@/types/timeliner"
import { useTimelineStore } from "@/store/timeline-store"
import { evaluateChannelAtTime } from "@/lib/timeline-utils"

interface ChannelItemProps {
  channel: Channel
}

const typeColorMap: Record<string, string> = {
  float: "text-blue-400",
  bool: "text-green-400",
  int: "text-yellow-400",
  color: "text-purple-400",
}

function formatValue(
  value: number | boolean | string | null,
  type: Channel["type"]
): string {
  if (value === null) return "—"
  switch (type) {
    case "bool":
      return value ? "ON" : "OFF"
    case "float":
      return (value as number).toFixed(3)
    case "int":
      return String(Math.round(value as number))
    case "color":
      return String(value)
  }
}

export function ChannelItem({ channel }: ChannelItemProps) {
  const selectedChannelId = useTimelineStore((s) => s.selectedChannelId)
  const selectChannel = useTimelineStore((s) => s.selectChannel)
  const currentTime = useTimelineStore((s) => s.currentTime)
  const isPlaying = useTimelineStore((s) => s.isPlaying)
  const isSelected = selectedChannelId === channel.id

  const currentValue = evaluateChannelAtTime(channel, currentTime)

  return (
    <div
      className={`flex items-center gap-2 px-3 h-[46px] border-b border-border/50 cursor-pointer group ${
        isSelected
          ? "bg-accent/80"
          : "hover:bg-accent/50"
      }`}
      onClick={() => selectChannel(channel.id)}
    >
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-medium truncate">{channel.name}</span>
        <span
          className={`text-xs ${typeColorMap[channel.type] || "text-muted-foreground"}`}
        >
          ({channel.type})
        </span>
      </div>
      {/* Live value display */}
      <div className="flex items-center gap-1 shrink-0">
        {channel.type === "color" && currentValue ? (
          <div
            className="w-4 h-4 rounded border border-border"
            style={{ backgroundColor: String(currentValue) }}
          />
        ) : null}
        <span
          className={`text-xs font-mono tabular-nums ${
            isPlaying ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {formatValue(currentValue, channel.type)}
        </span>
      </div>
    </div>
  )
}
