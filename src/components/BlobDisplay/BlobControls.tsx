import { BlobRangeSlider, BlobCountSlider, ScaleSelect } from "./Selectors";
import "./BlobControls.css";
import type { ScaleName } from "../../constants/scales";

type BlobControlsProps = {
  durationRange: [number, number];
  setDurationRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  playbackRateRange: [number, number];
  setPlaybackRateRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  fadeRange: [number, number];
  setFadeRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  numBlobs: number;
  setNumBlobs: React.Dispatch<React.SetStateAction<number>>;
  selectedScale: ScaleName; // Optional, if you want to handle scale selection
  setSelectedScale: React.Dispatch<React.SetStateAction<ScaleName>>;
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
  selectedScale,
  setSelectedScale,
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
        label="Playback/Pitch (sample rate %)"
        range={playbackRateRange}
        setRange={setPlaybackRateRange}
        min={0.5}
        max={4.0}
        step={0.05}
      />
      <ScaleSelect value={selectedScale} onChange={setSelectedScale} />
    </div>
  );
};

export default BlobControls;
