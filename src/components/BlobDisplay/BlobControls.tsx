import { BlobRangeSlider, BlobCountSlider, ScaleSelect } from "./Selectors";
import "./BlobControls.css";
import type {
  RangeControl,
  CountControl,
} from "../AudioBlobularPlayer/AudioBlobularPlayer.types";
import type { ScaleName } from "../../constants/scales";
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
  useEffect(() => {
    const durationStart = duration.range[0];
    const FadeRangeTop = fade.range[1];

    if (durationStart < FadeRangeTop) {
      fade.setRange([fade.min, durationStart]);
    }
  }, [duration.range]);

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
