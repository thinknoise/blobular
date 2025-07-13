import { useState } from "react";
import { ALL_SCALES, type ScaleName } from "../constants/scales";
import type {
  ControlsState,
  Range,
} from "../components/AudioBlobularPlayer/AudioBlobularPlayer.types";

export function useControls(initial?: Partial<ControlsState>) {
  const [controls, setControls] = useState<ControlsState>({
    duration: initial?.duration ?? {
      range: [0.8, 8.8],
      setRange: (range: [number, number]) => {
        setControls((prev) => ({
          ...prev,
          duration: { ...prev.duration, range },
        }));
      },
      min: 0.01,
      max: 10,
      step: 0.01,
    },
    fade: initial?.fade ?? {
      range: [0.1, 1.0],
      setRange: (range: [number, number]) => {
        setControls((prev) => ({
          ...prev,
          fade: { ...prev.fade, range },
        }));
      },
      min: 0.1,
      max: 3.0,
      step: 0.1,
    },
    playbackRate: initial?.playbackRate ?? {
      range: [0.9, 1.4],
      setRange: (range: [number, number]) => {
        setControls((prev) => ({
          ...prev,
          playbackRate: { ...prev.playbackRate, range },
        }));
      },
      min: 0.25,
      max: 4.0,
      step: 0.05,
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
    controls,
    setRangeControl,
    setNumBlobs,
    setSelectedScale,
  };
}
