# Timeliner App — Planning Document

## Vision

A timeline-based animation and scene editor for controlling hardware (lights, motors, devices) through keyframe-driven channels. Think "After Effects meets lighting console" — a professional tool for orchestrating time-based hardware scenes.

---

## UX Decisions (Agreed)

| Decision | Choice | Notes |
|---|---|---|
| **UI Paradigm** | Timeline tracks | Horizontal timeline with stacked channel tracks, playhead, keyframe diamonds |
| **Platform** | Web-first, desktop later | Start as a web app (FastAPI + React), wrap with Tauri later if needed |
| **Frontend Framework** | React + TypeScript | Implied by shadcn/ui choice; largest ecosystem for timeline/canvas UI libs |
| **MVP Scope** | Full editor shell | Build the complete layout chrome with all panels, stubs are fine for unfinished features |
| **Visual Style** | Dark pro-tool | Dense, information-rich dark theme — inspired by Blender, DaVinci Resolve, VS Code |
| **Layout** | Classic DAW | Channel list (left), timeline (center), properties panel (right), transport bar (top) |
| **Time Model** | Configurable per-project | Support seconds, frames (configurable FPS), and BPM — user picks per project |
| **Interpolation** | Linear + step (for now) | Start simple, but design the data model to support bezier curves later |
| **UI Toolkit** | shadcn/ui + Tailwind CSS | Customizable component primitives, excellent dark theme support |
| **Channels (MVP)** | Hardcoded demo set | Ship with pre-made demo channels (bool, float, int, color) — no CRUD UI yet |
| **Data Persistence** | FastAPI backend + JSON files | Save projects as JSON files on the server via API — human-readable, git-friendly |

---

## Editor Shell Layout

```
┌──────────────────────────────────────────────────────┐
│  [▶] [❚❚] [■]   00:00.000 / 00:30.000    [⚙ Settings] │
├──────────┬────────────────────────────────┬──────────┤
│ Channels │        Timeline                │ Props    │
│          │  |.....|.....|.....|.....|     │          │
│ ► Light1 │--◆----◆-------◆-----------     │ Name:    │
│   (float)│                                │ Type:    │
│ ► Motor1 │----◆---------◆-----------     │ Value:   │
│   (float)│                                │ Interp:  │
│ ► Color1 │-◆--◆---◆----◆-----------     │          │
│   (color)│                                │          │
│ ► Switch │---████---████-----------       │          │
│   (bool) │                                │          │
│ ► Pos1   │--◆------◆----◆-----------     │          │
│   (int)  │                                │          │
│          │        ▼ (playhead)            │          │
├──────────┴────────────────────────────────┴──────────┤
│ Status bar: FPS: 30 | Time mode: Seconds | Zoom: 1x │
└──────────────────────────────────────────────────────┘
```

---

## Channel Types (MVP Demo Set)

| Type | Display | Keyframe Value | Example Use |
|---|---|---|---|
| `bool` | Filled blocks (on/off regions) | `true` / `false` | Relay, solenoid, trigger |
| `float` | Curve/line between keyframes | `0.0` — `1.0` (normalized) | Brightness, motor speed |
| `int` | Stepped or interpolated line | Integer range (configurable) | Position, DMX value |
| `color` | Color gradient between keyframes | RGB / HSL | LED color, stage wash |

---

## Data Model (Draft)

```json
{
  "project": {
    "name": "My Scene",
    "duration": 30.0,
    "timeMode": "seconds",
    "fps": 30
  },
  "channels": [
    {
      "id": "ch-001",
      "name": "Light1",
      "type": "float",
      "config": { "min": 0.0, "max": 1.0 },
      "keyframes": [
        { "time": 0.0, "value": 0.0, "interpolation": "linear" },
        { "time": 2.5, "value": 1.0, "interpolation": "linear" },
        { "time": 5.0, "value": 0.0, "interpolation": "step" }
      ]
    },
    {
      "id": "ch-002",
      "name": "Switch",
      "type": "bool",
      "config": {},
      "keyframes": [
        { "time": 1.0, "value": true, "interpolation": "step" },
        { "time": 3.0, "value": false, "interpolation": "step" }
      ]
    },
    {
      "id": "ch-003",
      "name": "Color1",
      "type": "color",
      "config": {},
      "keyframes": [
        { "time": 0.0, "value": "#ff0000", "interpolation": "linear" },
        { "time": 4.0, "value": "#0000ff", "interpolation": "linear" }
      ]
    }
  ]
}
```

---

## Tech Stack

### Backend (FastAPI — existing template)
- **FastAPI** — API server, project file management, future hardware bridge
- **JSON file storage** — each project saved as a `.json` file
- **Endpoints (MVP)**:
  - `GET /api/projects` — list saved projects
  - `GET /api/projects/{id}` — load a project
  - `POST /api/projects` — create a new project
  - `PUT /api/projects/{id}` — save/update a project
  - Future: WebSocket endpoint for real-time playback → hardware output

### Frontend (React)
- **React 18+ with TypeScript**
- **shadcn/ui** — component primitives (buttons, inputs, dropdowns, sliders, dialogs)
- **Tailwind CSS** — utility styling, dark theme
- **Canvas or SVG** — for the timeline track rendering (keyframes, playhead, rulers)
- **Zustand or React Context** — lightweight client state management

---

## MVP Build Phases

### Phase 1 — Editor Shell (layout only)
- Set up React + Vite + Tailwind + shadcn/ui
- Build the 4-panel layout: transport bar, channel list, timeline area, properties panel
- All panels are present but mostly static/placeholder
- Dark theme applied globally
- Resizable panels (left/right widths adjustable)

### Phase 2 — Timeline Core
- Render a time ruler with configurable units (seconds/frames/beats)
- Render channel tracks as horizontal lanes
- Place keyframe markers (diamonds) at correct positions
- Implement playhead (draggable vertical line)
- Zoom in/out on the timeline (scroll wheel or controls)
- Scroll vertically through many channels

### Phase 3 — Keyframe Editing
- Click on a track to add a keyframe at that time position
- Select a keyframe to see its properties in the right panel
- Edit keyframe value and interpolation type
- Delete keyframes
- Drag keyframes left/right to change their time
- Visual preview of interpolated values between keyframes

### Phase 4 — Playback Engine
- Play/pause/stop transport controls
- Playhead advances in real-time during playback
- Evaluate all channels at current time (interpolate between keyframes)
- Display current computed values in the properties panel or channel list
- Loop mode

### Phase 5 — Persistence
- Wire up FastAPI endpoints for project CRUD
- Save/load projects to/from the backend
- New project, open project, save project UI

---

## Open Questions (for future discussion)

- **Hardware output**: Protocol support (DMX/ArtNet, serial, MQTT, GPIO)? WebSocket bridge from frontend → backend → hardware?
- **Multi-scene support**: Single timeline per project, or multiple scenes/cues?
- **Undo/redo**: Command pattern? How deep should the history go?
- **Copy/paste keyframes**: Across channels? Time-offset paste?
- **Snapping**: Snap keyframes to grid, to other keyframes, to beat markers?
- **Audio sync**: Import an audio track to sync animations to music?
- **Device profiles**: Reusable device definitions (e.g., "RGB LED strip" with 3 float channels)?
- **Desktop wrapping**: Tauri vs Electron when the time comes?

---

*Document started: 2026-02-19*
*Status: UX direction agreed, ready for Phase 1 implementation*
