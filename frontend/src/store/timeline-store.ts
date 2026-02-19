import { create } from "zustand"
import type { Channel, Keyframe, Project } from "@/types/timeliner"
import { DEMO_CHANNELS } from "@/data/demo-channels"

export type LoopMode = "off" | "loop"

interface TimelineState {
  // Project data
  projectId: string | null
  project: Project
  channels: Channel[]
  isDirty: boolean

  // Viewport
  pixelsPerSecond: number
  scrollLeft: number
  scrollTop: number

  // Playhead
  currentTime: number

  // Playback
  isPlaying: boolean
  playbackSpeed: number
  loopMode: LoopMode

  // Selection
  selectedChannelId: string | null
  selectedKeyframeIndex: number | null

  // Drag state
  draggingKeyframe: boolean

  // Constants
  trackHeight: number
  rulerHeight: number

  // Actions
  setCurrentTime: (time: number) => void
  setPixelsPerSecond: (pps: number) => void
  zoomAtPoint: (delta: number, pivotX: number) => void
  setScrollLeft: (px: number) => void
  setScrollTop: (px: number) => void
  selectChannel: (channelId: string | null) => void
  selectKeyframe: (
    channelId: string | null,
    keyframeIndex: number | null
  ) => void
  setChannels: (channels: Channel[]) => void

  // Playback actions
  play: () => void
  pause: () => void
  stop: () => void
  togglePlayPause: () => void
  setPlaybackSpeed: (speed: number) => void
  setLoopMode: (mode: LoopMode) => void

  // Keyframe editing actions
  addKeyframe: (channelId: string, time: number) => void
  updateKeyframe: (
    channelId: string,
    keyframeIndex: number,
    updates: Partial<Keyframe>
  ) => void
  deleteKeyframe: (channelId: string, keyframeIndex: number) => void
  moveKeyframe: (channelId: string, keyframeIndex: number, newTime: number) => void
  setDraggingKeyframe: (dragging: boolean) => void

  // Persistence actions
  loadProject: (id: string, project: Project, channels: Channel[]) => void
  newProject: (project: Project) => void
  setProjectId: (id: string) => void
  clearDirty: () => void
}

function getDefaultValue(channel: Channel): number | boolean | string {
  switch (channel.type) {
    case "bool":
      return false
    case "float":
      return channel.config.min ?? 0
    case "int":
      return channel.config.min ?? 0
    case "color":
      return "#ffffff"
  }
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  projectId: null,
  project: {
    name: "Demo Project",
    duration: 30.0,
    timeMode: "seconds",
    fps: 30,
  },
  channels: DEMO_CHANNELS,
  isDirty: false,

  pixelsPerSecond: 80,
  scrollLeft: 0,
  scrollTop: 0,

  currentTime: 0,

  isPlaying: false,
  playbackSpeed: 1,
  loopMode: "off",

  selectedChannelId: null,
  selectedKeyframeIndex: null,

  draggingKeyframe: false,

  trackHeight: 46,
  rulerHeight: 40,

  setCurrentTime: (time) => {
    const { project } = get()
    set({ currentTime: Math.max(0, Math.min(time, project.duration)) })
  },

  play: () => {
    const { currentTime, project } = get()
    // If at the end, restart from beginning
    if (currentTime >= project.duration) {
      set({ currentTime: 0, isPlaying: true })
    } else {
      set({ isPlaying: true })
    }
  },

  pause: () => set({ isPlaying: false }),

  stop: () => set({ isPlaying: false, currentTime: 0 }),

  togglePlayPause: () => {
    const { isPlaying } = get()
    if (isPlaying) {
      get().pause()
    } else {
      get().play()
    }
  },

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setLoopMode: (mode) => set({ loopMode: mode }),

  setPixelsPerSecond: (pps) => {
    set({ pixelsPerSecond: Math.max(10, Math.min(500, pps)) })
  },

  zoomAtPoint: (delta, pivotX) => {
    const { pixelsPerSecond, scrollLeft } = get()
    const timeAtPivot = (scrollLeft + pivotX) / pixelsPerSecond
    const newPps = Math.max(10, Math.min(500, pixelsPerSecond * (1 + delta)))
    const newScrollLeft = timeAtPivot * newPps - pivotX
    set({
      pixelsPerSecond: newPps,
      scrollLeft: Math.max(0, newScrollLeft),
    })
  },

  setScrollLeft: (px) => set({ scrollLeft: Math.max(0, px) }),
  setScrollTop: (px) => set({ scrollTop: Math.max(0, px) }),

  selectChannel: (channelId) =>
    set({ selectedChannelId: channelId, selectedKeyframeIndex: null }),

  selectKeyframe: (channelId, keyframeIndex) =>
    set({ selectedChannelId: channelId, selectedKeyframeIndex: keyframeIndex }),

  setChannels: (channels) => set({ channels }),

  addKeyframe: (channelId, time) => {
    const { channels, project } = get()
    const clampedTime = Math.max(0, Math.min(time, project.duration))
    const newChannels = channels.map((ch) => {
      if (ch.id !== channelId) return ch
      // Don't add if a keyframe already exists very close to this time
      const tooClose = ch.keyframes.some(
        (kf) => Math.abs(kf.time - clampedTime) < 0.01
      )
      if (tooClose) return ch
      const newKf: Keyframe = {
        time: Math.round(clampedTime * 1000) / 1000,
        value: getDefaultValue(ch),
        interpolation: ch.type === "bool" ? "step" : "linear",
      }
      const newKeyframes = [...ch.keyframes, newKf].sort(
        (a, b) => a.time - b.time
      )
      return { ...ch, keyframes: newKeyframes }
    })
    // Find the new index after sorting
    const channel = newChannels.find((ch) => ch.id === channelId)
    const newIndex = channel
      ? channel.keyframes.findIndex(
          (kf) => Math.abs(kf.time - clampedTime) < 0.01
        )
      : null
    set({
      channels: newChannels,
      selectedChannelId: channelId,
      selectedKeyframeIndex: newIndex,
      isDirty: true,
    })
  },

  updateKeyframe: (channelId, keyframeIndex, updates) => {
    const { channels } = get()
    const newChannels = channels.map((ch) => {
      if (ch.id !== channelId) return ch
      const newKeyframes = ch.keyframes.map((kf, i) =>
        i === keyframeIndex ? { ...kf, ...updates } : kf
      )
      return { ...ch, keyframes: newKeyframes }
    })
    set({ channels: newChannels, isDirty: true })
  },

  deleteKeyframe: (channelId, keyframeIndex) => {
    const { channels, selectedChannelId, selectedKeyframeIndex } = get()
    const newChannels = channels.map((ch) => {
      if (ch.id !== channelId) return ch
      return {
        ...ch,
        keyframes: ch.keyframes.filter((_, i) => i !== keyframeIndex),
      }
    })
    // Adjust selection
    let newSelectedIndex: number | null = null
    if (selectedChannelId === channelId && selectedKeyframeIndex !== null) {
      const remaining = newChannels.find((ch) => ch.id === channelId)
        ?.keyframes.length ?? 0
      if (remaining > 0) {
        newSelectedIndex = Math.min(keyframeIndex, remaining - 1)
      }
    }
    set({
      channels: newChannels,
      selectedKeyframeIndex: newSelectedIndex,
      isDirty: true,
    })
  },

  moveKeyframe: (channelId, keyframeIndex, newTime) => {
    const { channels, project } = get()
    const clampedTime = Math.round(
      Math.max(0, Math.min(newTime, project.duration)) * 1000
    ) / 1000
    let newIndex = keyframeIndex
    const newChannels = channels.map((ch) => {
      if (ch.id !== channelId) return ch
      const newKeyframes = ch.keyframes.map((kf, i) =>
        i === keyframeIndex ? { ...kf, time: clampedTime } : kf
      )
      newKeyframes.sort((a, b) => a.time - b.time)
      // Find where the moved keyframe ended up
      newIndex = newKeyframes.findIndex((kf) => kf.time === clampedTime)
      return { ...ch, keyframes: newKeyframes }
    })
    set({
      channels: newChannels,
      selectedKeyframeIndex: newIndex,
      isDirty: true,
    })
  },

  setDraggingKeyframe: (dragging) => set({ draggingKeyframe: dragging }),

  // Persistence actions
  loadProject: (id, project, channels) =>
    set({
      projectId: id,
      project,
      channels,
      isDirty: false,
      currentTime: 0,
      isPlaying: false,
      selectedChannelId: null,
      selectedKeyframeIndex: null,
      scrollLeft: 0,
      scrollTop: 0,
    }),

  newProject: (project) =>
    set({
      projectId: null,
      project,
      channels: [],
      isDirty: false,
      currentTime: 0,
      isPlaying: false,
      selectedChannelId: null,
      selectedKeyframeIndex: null,
      scrollLeft: 0,
      scrollTop: 0,
    }),

  setProjectId: (id) => set({ projectId: id }),

  clearDirty: () => set({ isDirty: false }),
}))
