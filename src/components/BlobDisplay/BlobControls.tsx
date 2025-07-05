import React from "react";

type BlobControlsProps = {
  durationRange: [number, number];
  setDurationRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  playbackRateRange: [number, number];
  setPlaybackRateRange: React.Dispatch<React.SetStateAction<[number, number]>>;
};

const BlobControls = ({
  durationRange,
  setDurationRange,
  playbackRateRange,
  setPlaybackRateRange,
}: BlobControlsProps) => {
  return (
    <div className="blob-controls">
      <label>
        Duration Min: {durationRange[0].toFixed(2)}s
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value={durationRange[0]}
          onChange={(e) =>
            setDurationRange([parseFloat(e.target.value), durationRange[1]])
          }
        />
      </label>

      <label>
        Duration Max: {durationRange[1].toFixed(2)}s
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value={durationRange[1]}
          onChange={(e) =>
            setDurationRange([durationRange[0], parseFloat(e.target.value)])
          }
        />
      </label>

      <label>
        PlaybackRate Min: {playbackRateRange[0].toFixed(2)}
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={playbackRateRange[0]}
          onChange={(e) =>
            setPlaybackRateRange([
              parseFloat(e.target.value),
              playbackRateRange[1],
            ])
          }
        />
      </label>

      <label>
        PlaybackRate Max: {playbackRateRange[1].toFixed(2)}
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={playbackRateRange[1]}
          onChange={(e) =>
            setPlaybackRateRange([
              playbackRateRange[0],
              parseFloat(e.target.value),
            ])
          }
        />
      </label>
    </div>
  );
};

export default BlobControls;
