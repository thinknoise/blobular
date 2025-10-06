import type { ScaleName } from "./scales";

export const controlLimits = {
  MIN_BLOBS: 1,
  MAX_BLOBS: 20,
  DEFAULT_BLOBS: 8,
  MIN_DURATION: 0.3, // Minimum practical blob duration
  MAX_DURATION: 3000, // Will be overridden by buffer duration
  MIN_FADE: 0.1,
  MAX_FADE: 3.0,
  MIN_PLAYBACK_RATE: 0.25,
  MAX_PLAYBACK_RATE: 4.0,
  DEFAULT_PLAYBACK_RATE: 1.0,
  DEFAULT_DURATION_RANGE: [0.8, 8.8] as [number, number],
  DEFAULT_FADE_RANGE: [0.1, 1.0] as [number, number],
  DEFAULT_PLAYBACK_RATE_RANGE: [0.9, 1.4] as [number, number],
  DEFAULT_SCALE: "MajorChord" as ScaleName,
};
