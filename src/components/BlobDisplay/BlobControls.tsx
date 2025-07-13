import { useEffect } from "react";
import { BlobRangeSlider, BlobCountSlider, ScaleSelect } from "./Selectors";
import "./BlobControls.css";
import type {
  RangeControl,
  CountControl,
} from "../AudioBlobularPlayer/AudioBlobularPlayer.types";
import type { ScaleName } from "../../constants/scales";

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
  useEffect(() => {
    // Ensure the duration range is always valid
    if (duration.range[0] < duration.min) {
      duration.setRange([duration.min, duration.range[1]]);
    }
    if (duration.range[1] > duration.max) {
      duration.setRange([duration.range[0], duration.max]);
    }
  }, [duration]);
  return (
    <div className="blob-controls">
      <BlobCountSlider
        label="Number of Blobs"
        value={numBlobs.value}
        setValue={numBlobs.setValue}
        min={numBlobs.min}
        max={numBlobs.max}
        step={numBlobs.step}
      />
      <BlobRangeSlider
        label="Duration (secs)"
        range={duration.range}
        setRange={duration.setRange}
        min={duration.min}
        max={duration.max}
        step={duration.step}
      />
      <BlobRangeSlider
        label="Fade in/Out (secs)"
        range={fade.range}
        setRange={fade.setRange}
        min={fade.min}
        max={fade.max}
        step={fade.step}
      />
      <BlobRangeSlider
        label="Playback/Pitch (sample rate %)"
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
    </div>
  );
};

export default BlobControls;
