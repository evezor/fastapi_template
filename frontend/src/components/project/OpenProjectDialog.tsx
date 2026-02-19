import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useTimelineStore } from "@/store/timeline-store"
import type { ProjectSummary } from "@/types/timeliner"
import * as api from "@/services/api"

interface OpenProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OpenProjectDialog({ open, onOpenChange }: OpenProjectDialogProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProject = useTimelineStore((s) => s.loadProject)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    api
      .listProjects()
      .then(setProjects)
      .catch(() => setError("Failed to load project list. Is the backend running?"))
      .finally(() => setLoading(false))
  }, [open])

  async function handleOpen(id: string) {
    try {
      const data = await api.loadProject(id)
      loadProject(data.id, data.project, data.channels)
      onOpenChange(false)
    } catch {
      setError("Failed to load project")
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteProject(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch {
      setError("Failed to delete project")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Open Project</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          )}

          {error && (
            <p className="text-sm text-destructive text-center py-4">{error}</p>
          )}

          {!loading && !error && projects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No saved projects yet.
            </p>
          )}

          {!loading && projects.length > 0 && (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent cursor-pointer group"
                  onClick={() => handleOpen(p.id)}
                >
                  <span className="text-sm truncate">{p.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(p.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
