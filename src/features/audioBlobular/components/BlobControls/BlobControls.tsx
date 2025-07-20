import { controlLimits } from "@/shared/constants/controlLimits";
import {
  BlobRangeSlider,
  BlobCountDropDown,
  ScaleSelect,
} from "@/features/audioBlobular/components";
import "./BlobControls.css";
import type {
  RangeControl,
  CountControl,
} from "../../types/AudioBlobularPlayer.types";
import type { ScaleName } from "@/shared/constants/scales";
import { useEffect } from "react";

export type ScaleControl = {
  value: ScaleName;
  setValue: (scale: ScaleName) => void;
};

type BlobControlsProps = {
  duration: RangeControl & { setRange: (range: [number, number]) => void };
  fade: RangeControl & { setRange: (range: [number, number]) => void };
  playbackRate: RangeControl & { setRange: (range: [number, number]) => void };
  numBlobs: CountControl & { setValue: (val: number) => void };
  selectedScale: ScaleControl;
};

const BlobControls = ({
  duration,
  fade,
  playbackRate,
  numBlobs,
  selectedScale,
}: BlobControlsProps) => {
  // fade guardrail against duration being less than fade
  useEffect(() => {
    const durationStart = duration.range[0];
    const FadeRangeTop = fade.range[1];

    if (durationStart < FadeRangeTop) {
      fade.setRange([fade.min, durationStart]);
    }
  }, [duration.range, fade.range]);

  return (
    <div className="blob-controls">
      <BlobRangeSlider
        label="Duration"
        range={duration.range}
        setRange={duration.setRange}
        min={duration.min}
        max={duration.max}
        step={duration.step}
      />
      <div style={{ width: "200px" }}>
        <BlobRangeSlider
          label="Fade tail"
          range={fade.range}
          setRange={fade.setRange}
          min={fade.min}
          max={fade.max}
          step={fade.step}
        />
      </div>
      <BlobRangeSlider
        label="Playback sample rate"
        range={playbackRate.range}
        setRange={playbackRate.setRange}
        min={playbackRate.min}
        max={playbackRate.max}
        step={playbackRate.step}
      />
      <ScaleSelect
        value={selectedScale.value}
        onChange={selectedScale.setValue}
      />
      <BlobCountDropDown
        label="Blobs"
        value={numBlobs.value}
        setValue={numBlobs.setValue}
        min={numBlobs.min ?? 1} // todo: centralize the minimum value default
        max={numBlobs.max ?? controlLimits.MAX_BLOBS}
        step={numBlobs.step}
      />
    </div>
  );
};

export default BlobControls;
