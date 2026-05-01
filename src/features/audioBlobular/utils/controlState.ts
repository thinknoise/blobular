import { controlLimits } from "@/shared/constants/controlLimits";
import type {
  ControlsState,
  PartialControlsState,
  Range,
} from "../types/AudioBlobularPlayer.types";

type RangeControlKey = "duration" | "fade" | "playbackRate";

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function getNormalizedBounds(min: number, max: number): [number, number] {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return [lower, upper];
}

function clampRange(range: Range, min: number, max: number): Range {
  const [lower, upper] = getNormalizedBounds(min, max);
  const start = clamp(range[0], lower, upper);
  const end = clamp(range[1], lower, upper);
  return start <= end ? [start, end] : [end, start];
}

function clampBlobCount(controls: ControlsState): ControlsState["numBlobs"] {
  const min = controls.numBlobs.min ?? controlLimits.MIN_BLOBS;
  const max = controls.numBlobs.max ?? controlLimits.MAX_BLOBS;

  return {
    ...controls.numBlobs,
    value: clamp(controls.numBlobs.value, min, max),
  };
}

function applyDurationRange(controls: ControlsState, range: Range): ControlsState {
  const nextDurationRange = clampRange(
    range,
    controls.duration.min,
    controls.duration.max
  );
  const nextFadeEnd = Math.min(controls.fade.range[1], nextDurationRange[0]);

  return {
    ...controls,
    duration: {
      ...controls.duration,
      range: nextDurationRange,
    },
    fade: {
      ...controls.fade,
      range: [controls.fade.min, nextFadeEnd],
    },
  };
}

function applyFadeRange(controls: ControlsState, range: Range): ControlsState {
  const nextFadeRange = clampRange(range, controls.fade.min, controls.fade.max);

  if (nextFadeRange[1] <= controls.duration.range[0]) {
    return {
      ...controls,
      fade: {
        ...controls.fade,
        range: nextFadeRange,
      },
    };
  }

  return {
    ...controls,
    fade: {
      ...controls.fade,
      range: nextFadeRange,
    },
    duration: {
      ...controls.duration,
      range: clampRange(
        [nextFadeRange[1], controls.duration.max],
        controls.duration.min,
        controls.duration.max
      ),
    },
  };
}

function applyPlaybackRateRange(
  controls: ControlsState,
  range: Range
): ControlsState {
  return {
    ...controls,
    playbackRate: {
      ...controls.playbackRate,
      range: clampRange(range, controls.playbackRate.min, controls.playbackRate.max),
    },
  };
}

export function normalizeControlsState(controls: ControlsState): ControlsState {
  const durationBounds = getNormalizedBounds(
    controls.duration.min,
    controls.duration.max
  );
  const fadeBounds = getNormalizedBounds(controls.fade.min, controls.fade.max);
  const playbackRateBounds = getNormalizedBounds(
    controls.playbackRate.min,
    controls.playbackRate.max
  );

  let next: ControlsState = {
    ...controls,
    duration: {
      ...controls.duration,
      min: durationBounds[0],
      max: durationBounds[1],
      range: clampRange(controls.duration.range, durationBounds[0], durationBounds[1]),
    },
    fade: {
      ...controls.fade,
      min: fadeBounds[0],
      max: fadeBounds[1],
      range: clampRange(controls.fade.range, fadeBounds[0], fadeBounds[1]),
    },
    playbackRate: {
      ...controls.playbackRate,
      min: playbackRateBounds[0],
      max: playbackRateBounds[1],
      range: clampRange(
        controls.playbackRate.range,
        playbackRateBounds[0],
        playbackRateBounds[1]
      ),
    },
    numBlobs: clampBlobCount(controls),
  };

  next = applyDurationRange(next, next.duration.range);

  return next;
}

export function createControlsState(initial?: PartialControlsState): ControlsState {
  return normalizeControlsState({
    duration: {
      range: initial?.duration?.range ?? controlLimits.DEFAULT_DURATION_RANGE,
      min: controlLimits.MIN_DURATION,
      max: controlLimits.MAX_DURATION,
      step: 0.01,
      ...(initial?.duration ?? {}),
    },
    fade: {
      range: initial?.fade?.range ?? controlLimits.DEFAULT_FADE_RANGE,
      min: controlLimits.MIN_FADE,
      max: controlLimits.MAX_FADE,
      step: 0.1,
      ...(initial?.fade ?? {}),
    },
    playbackRate: {
      range:
        initial?.playbackRate?.range ??
        controlLimits.DEFAULT_PLAYBACK_RATE_RANGE,
      min: controlLimits.MIN_PLAYBACK_RATE,
      max: controlLimits.MAX_PLAYBACK_RATE,
      step: 0.05,
      ...(initial?.playbackRate ?? {}),
    },
    numBlobs: initial?.numBlobs ?? {
      value: controlLimits.DEFAULT_BLOBS,
      min: controlLimits.MIN_BLOBS,
      max: controlLimits.MAX_BLOBS,
      step: 1,
    },
    selectedScale: initial?.selectedScale ?? controlLimits.DEFAULT_SCALE,
  });
}

export function applyRangeControlUpdate(
  controls: ControlsState,
  key: RangeControlKey,
  range: Range
): ControlsState {
  switch (key) {
    case "duration":
      return applyDurationRange(controls, range);
    case "fade":
      return applyFadeRange(controls, range);
    case "playbackRate":
      return applyPlaybackRateRange(controls, range);
  }
}

export function applyBufferDuration(
  controls: ControlsState,
  bufferDuration: number
): ControlsState {
  if (bufferDuration <= 0) {
    return controls;
  }

  const nextMinDuration = Math.min(controls.duration.min, bufferDuration);

  return normalizeControlsState({
    ...controls,
    duration: {
      ...controls.duration,
      min: nextMinDuration,
      max: bufferDuration,
    },
  });
}
