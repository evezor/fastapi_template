import { useEffect } from "react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { TransportBar } from "@/components/transport/TransportBar"
import { ChannelList } from "@/components/channels/ChannelList"
import { TimelineArea } from "@/components/timeline/TimelineArea"
import { PropertiesPanel } from "@/components/properties/PropertiesPanel"
import { StatusBar } from "@/components/status/StatusBar"
import { useTimelineStore } from "@/store/timeline-store"
import { usePlaybackEngine } from "@/hooks/use-playback-engine"
import * as api from "@/services/api"

export function EditorShell() {
  useKeyboardShortcuts()
  usePlaybackEngine()

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <TransportBar />

      <div className="flex-1 min-h-0">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full"
          id="timeliner-layout"
        >
          <ResizablePanel defaultSize="20" minSize="12" maxSize="35">
            <ChannelList />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="55" minSize="30">
            <TimelineArea />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="25" minSize="15" maxSize="35">
            <PropertiesPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <StatusBar />
    </div>
  )
}

function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S: save project (always capture, even in inputs)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        const state = useTimelineStore.getState()
        if (state.projectId) {
          api.saveProject(state.projectId, state.project, state.channels).then(() => state.clearDirty())
        } else {
          api.createProject(state.project, state.channels).then((saved) => {
            state.setProjectId(saved.id)
            state.clearDirty()
          })
        }
        return
      }

      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      const {
        selectedChannelId,
        selectedKeyframeIndex,
        deleteKeyframe,
        selectKeyframe,
        selectChannel,
        togglePlayPause,
      } = useTimelineStore.getState()

      if (e.key === " ") {
        e.preventDefault()
        togglePlayPause()
        return
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedChannelId && selectedKeyframeIndex !== null) {
          e.preventDefault()
          deleteKeyframe(selectedChannelId, selectedKeyframeIndex)
        }
      }

      if (e.key === "Escape") {
        if (selectedKeyframeIndex !== null) {
          selectKeyframe(selectedChannelId, null)
        } else if (selectedChannelId) {
          selectChannel(null)
        }
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])
}
