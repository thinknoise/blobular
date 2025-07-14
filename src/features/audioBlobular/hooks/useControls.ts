import { controlLimits } from "@/shared/constants/controlLimits";
import { useState } from "react";
import { ALL_SCALES, type ScaleName } from "@/shared/constants/scales";
import type { ControlsState, Range } from "../types/AudioBlobularPlayer.types";

function updateUrlFromControls(
  controls: Pick<
    ControlsState,
    "numBlobs" | "duration" | "playbackRate" | "selectedScale"
  >
) {
  const params = new URLSearchParams(window.location.search);

  if (controls.numBlobs?.value != null) {
    params.set("blobs", controls.numBlobs.value.toString());
  }

  const [min, max] = controls.duration.range ?? [];
  if (min != null && max != null) {
    params.set("duration", `${min.toFixed(2)}-${max.toFixed(2)}`);
  }

  const [minPlayback, maxPlayback] = controls.playbackRate.range ?? [];
  if (minPlayback != null && maxPlayback != null) {
    params.set("rate", `${minPlayback.toFixed(2)}-${maxPlayback.toFixed(2)}`);
  }

  if (controls.selectedScale) {
    params.set("scale", controls.selectedScale);
  } else {
    params.delete("scale");
  }

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
  const [hasInitializedFromUrl, setHasInitializedFromUrl] = useState(false);

  const [controls, setControls] = useState<ControlsState>({
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
    selectedScale: initial?.selectedScale ?? ALL_SCALES[7].name,
  });

  const updateControl = <K extends keyof ControlsState>(
    key: K,
    updateFn: (prev: ControlsState[K]) => ControlsState[K]
  ) => {
    setControls((prev) => {
      const next = {
        ...prev,
        [key]: updateFn(prev[key]),
      };

      if (hasInitializedFromUrl) {
        updateUrlFromControls({
          numBlobs: next.numBlobs,
          duration: next.duration,
          playbackRate: next.playbackRate,
          selectedScale: next.selectedScale,
        });
      }
      return next;
    });
  };

  const setRangeControl = (
    key: keyof Pick<ControlsState, "duration" | "fade" | "playbackRate">,
    range: Range
  ) => {
    updateControl(key, (prev) => ({ ...prev, range }));
  };

  const setNumBlobs = (value: number) => {
    updateControl("numBlobs", (prev) => ({ ...prev, value }));
  };

  const setPlaybackRate = (range: Range) => {
    updateControl("playbackRate", (prev) => ({ ...prev, range }));
  };

  const setSelectedScale = (scale: ScaleName) => {
    updateControl("selectedScale", () => scale);
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
    setControls,
    setPlaybackRate,
    hasInitializedFromUrl,
    setHasInitializedFromUrl,
  };
}
