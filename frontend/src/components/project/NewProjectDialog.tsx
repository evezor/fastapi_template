import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import * as api from "@/services/api"

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [name, setName] = useState("Untitled Project")
  const [duration, setDuration] = useState("30")
  const [timeMode, setTimeMode] = useState<"seconds" | "frames" | "bpm">("seconds")
  const [fps, setFps] = useState("30")
  const [saving, setSaving] = useState(false)

  const newProject = useTimelineStore((s) => s.newProject)
  const setProjectId = useTimelineStore((s) => s.setProjectId)

  async function handleCreate() {
    const project = {
      name: name.trim() || "Untitled Project",
      duration: Math.max(1, parseFloat(duration) || 30),
      timeMode,
      fps: Math.max(1, parseInt(fps) || 30),
    }

    setSaving(true)
    try {
      const saved = await api.createProject(project, [])
      newProject(saved.project)
      setProjectId(saved.id)
      onOpenChange(false)
    } catch {
      // If backend is unreachable, still create locally
      newProject(project)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled Project"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="duration">Duration (seconds)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              step="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Time Mode</Label>
            <Select value={timeMode} onValueChange={(v) => setTimeMode(v as typeof timeMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">Seconds</SelectItem>
                <SelectItem value="frames">Frames</SelectItem>
                <SelectItem value="bpm">BPM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fps">FPS</Label>
            <Input
              id="fps"
              type="number"
              min="1"
              max="240"
              value={fps}
              onChange={(e) => setFps(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
