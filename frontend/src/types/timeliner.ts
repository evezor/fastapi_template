export interface Project {
  name: string
  duration: number
  timeMode: "seconds" | "frames" | "bpm"
  fps: number
}

export interface Keyframe {
  time: number
  value: number | boolean | string
  interpolation: "linear" | "step"
}

export interface ChannelConfig {
  min?: number
  max?: number
}

export interface Channel {
  id: string
  name: string
  type: "bool" | "float" | "int" | "color"
  config: ChannelConfig
  keyframes: Keyframe[]
}

export interface TimelineProject {
  project: Project
  channels: Channel[]
}

export interface ProjectSummary {
  id: string
  name: string
}
