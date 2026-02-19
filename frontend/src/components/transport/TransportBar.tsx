import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Play,
  Pause,
  Square,
  Repeat,
  FilePlus,
  FolderOpen,
  Save,
} from "lucide-react"
import { useTimelineStore } from "@/store/timeline-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { NewProjectDialog } from "@/components/project/NewProjectDialog"
import { OpenProjectDialog } from "@/components/project/OpenProjectDialog"
import * as api from "@/services/api"

function formatTimecode(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  const whole = Math.floor(sec)
  const ms = Math.round((sec - whole) * 1000)
  return `${String(min).padStart(2, "0")}:${String(whole).padStart(2, "0")}.${String(ms).padStart(3, "0")}`
}

const SPEED_OPTIONS = [
  { value: "0.25", label: "0.25x" },
  { value: "0.5", label: "0.5x" },
  { value: "1", label: "1x" },
  { value: "2", label: "2x" },
  { value: "4", label: "4x" },
]

export function TransportBar() {
  const currentTime = useTimelineStore((s) => s.currentTime)
  const duration = useTimelineStore((s) => s.project.duration)
  const projectName = useTimelineStore((s) => s.project.name)
  const projectId = useTimelineStore((s) => s.projectId)
  const isDirty = useTimelineStore((s) => s.isDirty)
  const isPlaying = useTimelineStore((s) => s.isPlaying)
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed)
  const loopMode = useTimelineStore((s) => s.loopMode)
  const play = useTimelineStore((s) => s.play)
  const pause = useTimelineStore((s) => s.pause)
  const stop = useTimelineStore((s) => s.stop)
  const setPlaybackSpeed = useTimelineStore((s) => s.setPlaybackSpeed)
  const setLoopMode = useTimelineStore((s) => s.setLoopMode)

  const [newOpen, setNewOpen] = useState(false)
  const [openOpen, setOpenOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const state = useTimelineStore.getState()
    setSaving(true)
    try {
      if (state.projectId) {
        await api.saveProject(state.projectId, state.project, state.channels)
        state.clearDirty()
      } else {
        const saved = await api.createProject(state.project, state.channels)
        state.setProjectId(saved.id)
        state.clearDirty()
      }
    } catch {
      // silently fail — could add toast later
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between h-12 px-4 border-b border-border bg-card">
        <div className="flex items-center gap-1">
          {/* File actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setNewOpen(true)}
              >
                <FilePlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">New Project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpenOpen(true)}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Open Project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Save (Ctrl+S)</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Play / Pause toggle */}
          {isPlaying ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={pause}
                >
                  <Pause className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Pause (Space)</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={play}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Play (Space)</TooltipContent>
            </Tooltip>
          )}

          {/* Stop */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={stop}
              >
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Stop</TooltipContent>
          </Tooltip>

          {/* Loop toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={loopMode === "loop" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setLoopMode(loopMode === "off" ? "loop" : "off")
                }
              >
                <Repeat className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Loop: {loopMode === "loop" ? "On" : "Off"}
            </TooltipContent>
          </Tooltip>

          {/* Speed selector */}
          <Select
            value={String(playbackSpeed)}
            onValueChange={(v) => setPlaybackSpeed(parseFloat(v))}
          >
            <SelectTrigger className="h-7 w-[70px] text-xs ml-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Center: project name + timecode */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {projectName}
            {isDirty && <span className="text-primary ml-1">*</span>}
            {!projectId && (
              <span className="text-muted-foreground/50 ml-1 text-[10px]">unsaved</span>
            )}
          </span>
          <div className="font-mono text-sm text-muted-foreground">
            <span className={isPlaying ? "text-primary" : "text-foreground"}>
              {formatTimecode(currentTime)}
            </span>
            <span className="mx-2">/</span>
            <span>{formatTimecode(duration)}</span>
          </div>
        </div>

        <div className="w-[100px]" />
      </div>

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
      <OpenProjectDialog open={openOpen} onOpenChange={setOpenOpen} />
    </>
  )
}
