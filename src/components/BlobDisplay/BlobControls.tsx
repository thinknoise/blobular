import BlobRangeSlider from "./Sliders/BlobRangeSlider";
import "./BlobControls.css";
import BlobCountSlider from "./Sliders/BlobCountSlider";

type BlobControlsProps = {
  durationRange: [number, number];
  setDurationRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  playbackRateRange: [number, number];
  setPlaybackRateRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  fadeRange: [number, number];
  setFadeRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  numBlobs: number;
  setNumBlobs: React.Dispatch<React.SetStateAction<number>>;
};

const BlobControls = ({
  durationRange,
  setDurationRange,
  playbackRateRange,
  setPlaybackRateRange,
  fadeRange,
  setFadeRange,
  numBlobs,
  setNumBlobs,
}: BlobControlsProps) => {
  return (
    <div className="blob-controls">
      {setNumBlobs && (
        <BlobCountSlider
          label="Number of Blobs"
          value={numBlobs}
          setValue={setNumBlobs}
          min={1}
          max={12}
          step={1}
        />
      )}{" "}
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
