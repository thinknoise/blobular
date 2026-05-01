import { useEffect, useState } from "react";
import type {
  ControlsState,
  PartialControlsState,
  Range,
} from "../types/AudioBlobularPlayer.types";
import {
  applyBufferDuration,
  applyRangeControlUpdate,
  createControlsState,
} from "../utils/controlState";
import { getUrlStateSignature } from "../utils/controlUrlState";
import type { ScaleName } from "@/shared/constants/scales";

type UseControlsOptions = {
  initial?: PartialControlsState;
  bufferDuration?: number;
  onCommittedControlsChange?: (controls: ControlsState) => void;
};

export function useControls({
  initial,
  bufferDuration,
  onCommittedControlsChange,
}: UseControlsOptions) {
  const [hasEnabledCommittedSync, setHasEnabledCommittedSync] = useState(false);
  const [controls, setControls] = useState<ControlsState>(() =>
    createControlsState(initial)
  );

  const updateControls = (
    updateFn: (prev: ControlsState) => ControlsState,
    shouldNotify: boolean = false
  ) => {
    setControls((prev) => {
      const next = updateFn(prev);

      if (hasEnabledCommittedSync && shouldNotify) {
        onCommittedControlsChange?.(next);
      }

      return next;
    });
  };

  useEffect(() => {
    if (!bufferDuration) {
      return;
    }

    setControls((prev) => {
      const next = applyBufferDuration(prev, bufferDuration);
      const prevUrlState = getUrlStateSignature(prev);
      const nextUrlState = getUrlStateSignature(next);

      if (prevUrlState !== nextUrlState) {
        onCommittedControlsChange?.(next);
      }

      return next;
    });

    setHasEnabledCommittedSync(true);
  }, [bufferDuration, onCommittedControlsChange]);

  const setRangeControl = (
    key: keyof Pick<ControlsState, "duration" | "fade" | "playbackRate">,
    range: Range
  ) => {
    updateControls((prev) => applyRangeControlUpdate(prev, key, range));
  };

  const commitRangeControl = (
    key: keyof Pick<ControlsState, "duration" | "fade" | "playbackRate">,
    range: Range
  ) => {
    updateControls((prev) => applyRangeControlUpdate(prev, key, range), true);
  };

  const setNumBlobs = (value: number) => {
    updateControls(
      (prev) => ({
        ...prev,
        numBlobs: {
          ...prev.numBlobs,
          value,
        },
      }),
      true
    );
  };

  const setPlaybackRate = (range: Range) => {
    setRangeControl("playbackRate", range);
  };

  const commitPlaybackRate = (range: Range) => {
    commitRangeControl("playbackRate", range);
  };

  const setSelectedScale = (scale: ScaleName) => {
    updateControls(
      (prev) => ({
        ...prev,
        selectedScale: scale,
      }),
      true
    );
  };

  return {
    controls: {
      duration: {
        ...controls.duration,
        setRange: (range: Range) => setRangeControl("duration", range),
        commitRange: (range: Range) => commitRangeControl("duration", range),
      },
      fade: {
        ...controls.fade,
        setRange: (range: Range) => setRangeControl("fade", range),
        commitRange: (range: Range) => commitRangeControl("fade", range),
      },
      playbackRate: {
        ...controls.playbackRate,
        setRange: (range: Range) => setRangeControl("playbackRate", range),
        commitRange: (range: Range) =>
          commitRangeControl("playbackRate", range),
      },
      numBlobs: controls.numBlobs,
      selectedScale: controls.selectedScale,
    },
    setRangeControl,
    commitRangeControl,
    setNumBlobs,
    setSelectedScale,
    setPlaybackRate,
    commitPlaybackRate,
  };
}
