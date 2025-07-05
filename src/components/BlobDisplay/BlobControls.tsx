import BlobRangeSlider from "./BlobRangeSlider";

const BlobControls = ({
  durationRange,
  setDurationRange,
  playbackRateRange,
  setPlaybackRateRange,
}: BlobControlsProps) => {
  return (
    <div className="blob-controls">
      <BlobRangeSlider
        label="Duration Range (s)"
        range={durationRange}
        setRange={setDurationRange}
        min={0.1}
        max={10}
        step={0.1}
      />

      <BlobRangeSlider
        label="Playback Rate Range"
        range={playbackRateRange}
        setRange={setPlaybackRateRange}
        min={0.5}
        max={2.0}
        step={0.05}
      />
    </div>
  );
};

export default BlobControls;
type BlobControlsProps = {
  durationRange: [number, number];
  setDurationRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  playbackRateRange: [number, number];
  setPlaybackRateRange: React.Dispatch<React.SetStateAction<[number, number]>>;
};
