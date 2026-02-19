import type { Channel, Project, ProjectSummary } from "@/types/timeliner"

interface SavedProjectResponse {
  id: string
  project: Project
  channels: Channel[]
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const res = await fetch("/api/projects")
  if (!res.ok) throw new Error("Failed to list projects")
  return res.json()
}

export async function loadProject(id: string): Promise<SavedProjectResponse> {
  const res = await fetch(`/api/projects/${id}`)
  if (!res.ok) throw new Error("Failed to load project")
  return res.json()
}

export async function createProject(
  project: Project,
  channels: Channel[]
): Promise<SavedProjectResponse> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, channels }),
  })
  if (!res.ok) throw new Error("Failed to create project")
  return res.json()
}

export async function saveProject(
  id: string,
  project: Project,
  channels: Channel[]
): Promise<SavedProjectResponse> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, channels }),
  })
  if (!res.ok) throw new Error("Failed to save project")
  return res.json()
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete project")
}
