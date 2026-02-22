# Timeliner — Specification

Timeline-based animation & scene editor for controlling hardware (lights, motors, devices) through keyframe-driven channels. Think "After Effects meets lighting console."

---

## Tech Stack

### Backend
- **FastAPI** + **Pydantic** models
- **uvicorn** w/ `--reload`
- Storage: JSON files in `app/projects/`
- Async file I/O via `aiofiles`

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 4** (dark theme default, `storageKey: "timeliner-theme"`)
- **shadcn/ui** (Radix UI primitives) — button, input, label, select, dialog, tooltip, separator, scroll-area, resizable panels
- **Zustand** for state management
- **Lucide** icons
- **react-resizable-panels** for DAW-style layout

### Deployment
- Docker Compose: `home` (FastAPI) on port 8000, `frontend` (nginx) on port 3000
- Frontend Dockerfile: multi-stage (node build → nginx serve)
- Dev: `npm run dev` for Vite hot-reload on :5173

---

## Data Model

```typescript
Project       { name, duration, timeMode: "seconds"|"frames"|"bpm", fps }
Channel       { id, name, type: "bool"|"float"|"int"|"color", config: { min?, max? }, keyframes[] }
Keyframe      { time: number, value: number|boolean|string, interpolation: "linear"|"step" }
```

- Colors stored as hex `#RRGGBB` strings
- Backend Pydantic models mirror frontend TS types exactly

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects` | List saved projects (id + name) |
| POST | `/api/projects` | Create new project (returns saved w/ UUID) |
| GET | `/api/projects/{id}` | Load project |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |

- Path traversal protection on project IDs

---

## Layout

4-panel DAW-style, all resizable:
1. **Transport Bar** (top) — play/pause/stop, time display, speed selector, loop toggle, project name, save/new/open, dirty indicator
2. **Channel List** (left 20%) — channel names, types, live value preview, add channel button
3. **Timeline Area** (center 55%) — ruler w/ ticks, SVG tracks, keyframe markers, playhead, scroll/zoom
4. **Properties Panel** (right 25%) — channel info, keyframe editor (time, value, interpolation), delete button
5. **Status Bar** (bottom) — zoom %, channel/keyframe count

---

## Keyframe System

### Channel Types & Defaults
- **bool** — default `false`, always step interpolation, toggle ON/OFF button
- **float** — default `config.min ?? 0`, numeric input w/ step 0.01
- **int** — default `config.min ?? 0`, numeric input w/ step 1
- **color** — default `#ffffff`, custom color picker component

### Interpolation Modes
- **linear** — smooth interpolation between keyframes
- **step** — hold value until next keyframe (hard cut)

### Keyframe Marker Shapes (by interpolation type)
- **linear** → diamond
- **step** → square
- Extensible via `switch` statement for future types

### Adding Keyframes
- Double-click on a track at desired time
- Minimum distance check: won't add if within 0.01s of existing keyframe
- Auto-sorted by time after insertion
- Auto-selected after creation

### Keyframe Editing (Properties Panel)
- Time input (numeric, clamped to 0–duration)
- Value input (type-dependent — toggle, slider, number, or color picker)
- Interpolation selector (dropdown: linear / step)
- Delete button

### Keyframe Dragging
- Click to select, drag to reposition on timeline
- 3px threshold before drag starts
- Re-sorts keyframes during drag, updates selected index

---

## Color Picker

Custom built component (`ColorPicker.tsx`) with 3 selectable modes:

### Shared Elements
- Color preview swatch + hex text input (`#RRGGBB` with regex validation)
- Tab bar to switch modes (RGB | HSV | Wheel)
- Mode state persists while editing (editor key excludes value to prevent remount)

### RGB Mode
- 3 sliders: R (0–255), G (0–255), B (0–255)
- Each slider shows contextual gradient (e.g., R slider shows min→max red with current G/B held)
- Numeric input beside each slider

### HSV Mode
- 3 sliders: H (0–360), S (0–100), V (0–100)
- Hue slider: full rainbow spectrum
- Saturation/Value sliders: contextual gradients
- Numeric input beside each slider

### Color Wheel Mode
- Canvas-based HSV wheel (hue = angle, saturation = distance from center)
- Vertical value/brightness slider alongside
- Click or drag to pick, pointer events tracked globally for smooth dragging

### Color Conversions
- `hexToRgb`, `rgbToHex`, `rgbToHsv`, `hsvToRgb` — all self-contained in ColorPicker.tsx
- Separate `hexToRgb`/`rgbToHex` also in `timeline-utils.ts` for interpolation

---

## Timeline Rendering

### Tracks
- Each channel = one SVG track row
- Track height: 46px

### Color Channels — Gradient Visualization
- SVG `<linearGradient>` spanning first→last keyframe
- **linear** keyframes: smooth gradient between stops
- **step** keyframes: duplicate stop inserted at next keyframe position with current color → creates hard edge

### Float/Int Channels — Interpolation Path
- SVG polyline showing value curve
- Linear: straight line segments
- Step: horizontal then vertical segments

### Bool Channels — Block Visualization
- Solid blocks for ON regions
- Rounded rectangles with configurable color

### Ruler
- Auto-scaling tick intervals (0.1s to 60s)
- Major ticks labeled, minor ticks unlabeled
- Supports seconds, frames, BPM display

---

## Playback Engine

- `requestAnimationFrame` loop in `use-playback-engine.ts`
- Evaluates all channels at current time via `evaluateChannelAtTime()`
- Color interpolation: linear RGB blend between hex values
- Loop mode: restarts at 0 when reaching duration
- Speed: configurable playback rate multiplier

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Toggle play/pause |
| Delete / Backspace | Delete selected keyframe |
| Escape | Deselect keyframe → deselect channel |
| Ctrl+S | Save project |

- Shortcuts disabled when focus is in input/textarea/select

---

## State Management (Zustand)

Single store (`timeline-store.ts`) holds:
- Project metadata + channels + dirty flag
- Viewport state (pixelsPerSecond, scroll position)
- Playhead position + playback state (playing, speed, loop mode)
- Selection state (channel, keyframe index)
- Drag state
- All actions (CRUD keyframes, playback controls, persistence, zoom)

---

## Future Considerations

### Looping / Repeating Patterns (discussed, not yet implemented)
1. **Global transport loop** — loop-in/loop-out points on transport bar for preview
2. **Per-channel loop** — `loopStart`, `loopEnd`, `loopCount` in channel config; playback engine wraps time
3. **Patterns/Clips** — named reusable keyframe sequences placed on timeline like DAW clips
4. **Modifiers/Expressions** — post-processing stack: repeat, ping-pong, sine/square/sawtooth wave, strobe, remap
