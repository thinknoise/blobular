import { useState } from "react";
import { ALL_SCALES, type ScaleName } from "../../../shared/constants/scales";
import type { ControlsState, Range } from "../types/AudioBlobularPlayer.types";

function updateUrlFromControls(
  controls: Pick<ControlsState, "numBlobs" | "duration">
) {
  const params = new URLSearchParams(window.location.search);
  params.set("blobs", controls.numBlobs.value.toString());

  const [min, max] = controls.duration.range;
  params.set("duration", `${min.toFixed(2)},${max.toFixed(2)}`);

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

export type PartialControlsState = {
  duration?: Partial<ControlsState["duration"]>;
  fade?: Partial<ControlsState["fade"]>;
  playbackRate?: Partial<ControlsState["playbackRate"]>;
  numBlobs?: ControlsState["numBlobs"];
  selectedScale?: ControlsState["selectedScale"];
};

export function useControls(initial?: PartialControlsState) {
  const [controls, setControls] = useState<ControlsState>({
    duration: {
      range: initial?.duration?.range ?? [0.8, 8.8],
      min: 0.01,
      max: 10,
      step: 0.01,
      ...(initial?.duration ?? {}),
    },
    fade: {
      range: initial?.fade?.range ?? [0.1, 1.0],
      min: 0.1,
      max: 3.0,
      step: 0.1,
      ...(initial?.fade ?? {}),
    },
    playbackRate: {
      range: initial?.playbackRate?.range ?? [0.9, 1.4],
      min: 0.25,
      max: 4.0,
      step: 0.05,
      ...(initial?.playbackRate ?? {}),
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
    setControls((prev) => {
      const next = {
        ...prev,
        [key]: { ...prev[key], range },
      };
      if (key === "duration") {
        updateUrlFromControls({
          numBlobs: next.numBlobs,
          duration: next.duration,
        });
      }
      return next;
    });
  };

  const setNumBlobs = (value: number) => {
    setControls((prev) => {
      const next = {
        ...prev,
        numBlobs: { ...prev.numBlobs, value },
      };
      updateUrlFromControls({
        numBlobs: next.numBlobs,
        duration: next.duration,
      });
      return next;
    });
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
