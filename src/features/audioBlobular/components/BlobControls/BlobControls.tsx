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
import { blobControls, controlRow } from "./BlobControls.css";

// note: range values are in seconds, so we use for the blobs duration
// min and max are used to limit the range

export type ScaleControl = {
  value: ScaleName;
  setValue: (scale: ScaleName) => void;
};

type BlobControlsProps = {
  bufferLength: number;
  duration: RangeControl & { setRange: (range: [number, number]) => void };
  fade: RangeControl & { setRange: (range: [number, number]) => void };
  playbackRate: RangeControl & { setRange: (range: [number, number]) => void };
  numBlobs: CountControl & { setValue: (val: number) => void };
  selectedScale: ScaleControl;
};

const BlobControls = ({
  bufferLength,
  duration,
  fade,
  playbackRate,
  numBlobs,
  selectedScale,
}: BlobControlsProps) => {
  // fade guardrail against duration being less than fade
  useEffect(() => {
    const durationStart = duration.range[0];
    const fadeEnd = fade.range[1];

    if (fadeEnd > durationStart) {
      fade.setRange([fade.min, durationStart]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration.range]); // respond only to duration change

  useEffect(() => {
    const durationStart = duration.range[0];
    const fadeEnd = fade.range[1];

    if (fadeEnd > durationStart) {
      duration.setRange([fadeEnd, duration.max]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fade.range]); // respond only to fade change

  return (
    <div className={blobControls}>
      <div className={controlRow}>
        <div style={{ width: "200px" }}>
          <BlobRangeSlider
            label="Fade"
            range={fade.range}
            setRange={fade.setRange}
            min={fade.min}
            max={fade.max}
            step={fade.step}
          />
        </div>
        <BlobRangeSlider
          label="Duration"
          range={duration.range}
          setRange={duration.setRange}
          min={0.3}
          max={Math.min(18, bufferLength)}
          step={duration.step}
        />
      </div>
      <div className={controlRow}>
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
          min={numBlobs.min ?? 1}
          max={numBlobs.max ?? controlLimits.MAX_BLOBS}
          step={numBlobs.step}
        />
      </div>
    </div>
  );
};

export default BlobControls;
