import { ChannelItem } from "./ChannelItem"
import { useTimelineStore } from "@/store/timeline-store"

export function ChannelList() {
  const channels = useTimelineStore((s) => s.channels)
  const scrollTop = useTimelineStore((s) => s.scrollTop)
  const setScrollTop = useTimelineStore((s) => s.setScrollTop)

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) return
    e.preventDefault()
    setScrollTop(scrollTop + e.deltaY)
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between h-10 px-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Channels
        </span>
      </div>
      <div className="flex-1 overflow-hidden" onWheel={handleWheel}>
        <div style={{ transform: `translateY(${-scrollTop}px)` }}>
          {channels.map((channel) => (
            <ChannelItem key={channel.id} channel={channel} />
          ))}
        </div>
      </div>
    </div>
  )
}
