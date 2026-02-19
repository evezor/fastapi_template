import type { Channel } from "@/types/timeliner"

export const DEMO_CHANNELS: Channel[] = [
  {
    id: "ch-001",
    name: "Light1",
    type: "float",
    config: { min: 0.0, max: 1.0 },
    keyframes: [
      { time: 0.0, value: 0.0, interpolation: "linear" },
      { time: 2.5, value: 1.0, interpolation: "linear" },
      { time: 5.0, value: 0.0, interpolation: "step" },
    ],
  },
  {
    id: "ch-002",
    name: "Motor1",
    type: "float",
    config: { min: 0.0, max: 1.0 },
    keyframes: [
      { time: 3.0, value: 0.5, interpolation: "linear" },
      { time: 8.0, value: 1.0, interpolation: "linear" },
    ],
  },
  {
    id: "ch-003",
    name: "Color1",
    type: "color",
    config: {},
    keyframes: [
      { time: 0.0, value: "#ff0000", interpolation: "linear" },
      { time: 2.0, value: "#00ff00", interpolation: "linear" },
      { time: 4.0, value: "#0000ff", interpolation: "linear" },
      { time: 6.0, value: "#ff0000", interpolation: "linear" },
    ],
  },
  {
    id: "ch-004",
    name: "Switch",
    type: "bool",
    config: {},
    keyframes: [
      { time: 1.0, value: true, interpolation: "step" },
      { time: 3.0, value: false, interpolation: "step" },
      { time: 5.0, value: true, interpolation: "step" },
      { time: 7.0, value: false, interpolation: "step" },
    ],
  },
  {
    id: "ch-005",
    name: "Pos1",
    type: "int",
    config: { min: 0, max: 255 },
    keyframes: [
      { time: 1.5, value: 0, interpolation: "linear" },
      { time: 5.0, value: 128, interpolation: "linear" },
      { time: 8.0, value: 255, interpolation: "step" },
    ],
  },
]
