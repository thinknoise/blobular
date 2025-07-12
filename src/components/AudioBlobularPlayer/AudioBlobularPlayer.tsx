import { useState } from "react";
import { useBlobularEngine } from "../../hooks/useBlobularEngine";
import {
  BlobDisplay,
  BlobControls,
  BlobPanel,
  CompactWaveform,
} from "../BlobDisplay";
import { ALL_SCALES, type ScaleName } from "../../constants/scales";
import { Play, Square } from "lucide-react"; // or any icon library you use

import "./AudioBlobularPlayer.css"; // Ensure you have styles for the player

const AudioBlobularPlayer = () => {
  const [numBlobs, setNumBlobs] = useState(8); // You can adjust this if needed

  const [durationRange, setDurationRange] = useState<[number, number]>([
    0.8, 8.8,
  ]);
  const [playbackRateRange, setPlaybackRateRange] = useState<[number, number]>([
    0.9, 1.4,
  ]);
  const [selectedScale, setSelectedScale] = useState<ScaleName>(
    ALL_SCALES[0].name
  );

  const [fadeRange, setFadeRange] = useState<[number, number]>([0.1, 1.0]);

  const { start, stop, blobEvents, buffer } = useBlobularEngine(
    numBlobs,
    durationRange,
    playbackRateRange,
    fadeRange,
    selectedScale
  );

  const [isPlaying, setIsPlaying] = useState(false);

  function handleClick(): void {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
    setIsPlaying(!isPlaying);
  }

  return (
    <div className="audio-blobular-player">
      <button
        className={isPlaying ? "play-button playing" : "play-button"}
        onClick={handleClick}
      >
        <span className="blobular-title-chunk">Blobul</span>
        {isPlaying ? <Square /> : <Play />}
        <span className="blobular-title-chunk">r</span>
      </button>

      <div className="blobular-visualizer">
        <BlobPanel
          blobEvents={blobEvents}
          bufferDuration={buffer ? buffer.duration : 0}
        />
        {buffer && <CompactWaveform buffer={buffer} />}
      </div>

      <BlobControls
        durationRange={durationRange}
        setDurationRange={setDurationRange}
        playbackRateRange={playbackRateRange}
        setPlaybackRateRange={setPlaybackRateRange}
        fadeRange={fadeRange}
        setFadeRange={setFadeRange}
        numBlobs={numBlobs}
        setNumBlobs={setNumBlobs}
        selectedScale={selectedScale}
        setSelectedScale={setSelectedScale}
      />

      <BlobDisplay events={blobEvents} />
    </div>
  );
};

export default AudioBlobularPlayer;
