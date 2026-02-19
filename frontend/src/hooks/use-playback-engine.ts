import { useEffect, useRef } from "react"
import { useTimelineStore } from "@/store/timeline-store"

/**
 * Drives the playback loop using requestAnimationFrame.
 * Advances currentTime in real-time, handles looping, and auto-scrolls
 * the viewport to keep the playhead visible.
 */
export function usePlaybackEngine(viewportWidth?: number) {
  const rafRef = useRef<number>(0)
  const lastFrameTime = useRef<number>(0)
  const isPlaying = useTimelineStore((s) => s.isPlaying)

  useEffect(() => {
    if (!isPlaying) {
      lastFrameTime.current = 0
      return
    }

    const tick = (now: number) => {
      const {
        isPlaying: stillPlaying,
        currentTime,
        project,
        playbackSpeed,
        loopMode,
        setCurrentTime,
        pause,
        scrollLeft,
        setScrollLeft,
        pixelsPerSecond,
      } = useTimelineStore.getState()

      if (!stillPlaying) {
        lastFrameTime.current = 0
        return
      }

      if (lastFrameTime.current === 0) {
        lastFrameTime.current = now
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const deltaMs = now - lastFrameTime.current
      lastFrameTime.current = now

      // Cap delta to prevent huge jumps (e.g. after tab was unfocused)
      const deltaSec = Math.min(deltaMs / 1000, 0.1) * playbackSpeed
      let newTime = currentTime + deltaSec

      if (newTime >= project.duration) {
        if (loopMode === "loop") {
          newTime = newTime % project.duration
        } else {
          newTime = project.duration
          setCurrentTime(newTime)
          pause()
          return
        }
      }

      setCurrentTime(newTime)

      // Auto-scroll to keep playhead visible
      if (viewportWidth && viewportWidth > 0) {
        const playheadX = newTime * pixelsPerSecond
        const viewEnd = scrollLeft + viewportWidth
        const margin = viewportWidth * 0.1

        if (playheadX > viewEnd - margin) {
          setScrollLeft(playheadX - viewportWidth + margin)
        } else if (playheadX < scrollLeft + margin) {
          setScrollLeft(Math.max(0, playheadX - margin))
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    lastFrameTime.current = 0
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      lastFrameTime.current = 0
    }
  }, [isPlaying, viewportWidth])
}
