import BlobRangeSlider from "./BlobRangeSlider";
import "./BlobControls.css";

type BlobControlsProps = {
  durationRange: [number, number];
  setDurationRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  playbackRateRange: [number, number];
  setPlaybackRateRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  fadeRange: [number, number];
  setFadeRange: React.Dispatch<React.SetStateAction<[number, number]>>;
};

const BlobControls = ({
  durationRange,
  setDurationRange,
  playbackRateRange,
  setPlaybackRateRange,
  fadeRange,
  setFadeRange,
}: BlobControlsProps) => {
  return (
    <div className="blob-controls">
      <BlobRangeSlider
        label="Duration Range (secs)"
        range={durationRange}
        setRange={setDurationRange}
        min={0.1}
        max={10}
        step={0.1}
      />

      <BlobRangeSlider
        label="Fade in/Out (secs)"
        range={fadeRange}
        setRange={setFadeRange}
        min={0.1}
        max={3.0}
        step={0.1}
      />

      <BlobRangeSlider
        label="Playback/Pitch (sample rate)"
        range={playbackRateRange}
        setRange={setPlaybackRateRange}
        min={0.5}
        max={4.0}
        step={0.05}
      />
    </div>
  );
};

export default BlobControls;
