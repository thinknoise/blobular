import { useState } from "react";
import { ALL_SCALES, type ScaleName } from "../constants/scales";
import type {
  ControlsState,
  Range,
} from "../components/AudioBlobularPlayer/AudioBlobularPlayer.types";

export function useControls(initial?: Partial<ControlsState>) {
  const [controls, setControls] = useState<ControlsState>({
    duration: {
      range: initial?.duration?.range ?? [0.8, 8.8],
      min: initial?.duration?.min ?? 0.01,
      max: initial?.duration?.max ?? 10,
      step: initial?.duration?.step ?? 0.01,
    },
    fade: {
      range: initial?.fade?.range ?? [0.1, 1.0],
      min: initial?.fade?.min ?? 0.1,
      max: initial?.fade?.max ?? 3.0,
      step: initial?.fade?.step ?? 0.1,
    },
    playbackRate: {
      range: initial?.playbackRate?.range ?? [0.9, 1.4],
      min: initial?.playbackRate?.min ?? 0.25,
      max: initial?.playbackRate?.max ?? 4.0,
      step: initial?.playbackRate?.step ?? 0.05,
    },
    numBlobs: initial?.numBlobs ?? {
      value: 8,
      min: 1,
      max: 12,
      step: 1,
    },
    selectedScale: initial?.selectedScale ?? ALL_SCALES[7].name,
  });

  const setRangeControl = (
    key: keyof Pick<ControlsState, "duration" | "fade" | "playbackRate">,
    range: Range
  ) => {
    setControls((prev) => ({
      ...prev,
      [key]: { ...prev[key], range },
    }));
  };

  const setNumBlobs = (value: number) => {
    setControls((prev) => ({
      ...prev,
      numBlobs: { ...prev.numBlobs, value },
    }));
  };

  const setSelectedScale = (scale: ScaleName) => {
    setControls((prev) => ({
      ...prev,
      selectedScale: scale,
    }));
  };

  return {
    controls: {
      duration: {
        ...controls.duration,
        setRange: (range: Range) => setRangeControl("duration", range),
      },
      fade: {
        ...controls.fade,
        setRange: (range: Range) => setRangeControl("fade", range),
      },
      playbackRate: {
        ...controls.playbackRate,
        setRange: (range: Range) => setRangeControl("playbackRate", range),
      },
      numBlobs: controls.numBlobs,
      selectedScale: controls.selectedScale,
    },
    setRangeControl,
    setNumBlobs,
    setSelectedScale,
  };
}
