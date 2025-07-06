import { useState } from "react";
import { useBlobularEngine } from "./useBlobularEngine";
import { BlobDisplay, BlobControls } from "../BlobDisplay";

const AudioBlobularPlayer = () => {
  const [durationRange, setDurationRange] = useState<[number, number]>([
    0.8, 8.8,
  ]);
  const [playbackRateRange, setPlaybackRateRange] = useState<[number, number]>([
    0.9, 1.4,
  ]);
  const [fadeRange, setFadeRange] = useState<[number, number]>([0.1, 1.0]);

  const { start, stop, blobEvents } = useBlobularEngine(
    8,
    durationRange,
    playbackRateRange,
    fadeRange
  );

  return (
    <div>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>

      <BlobControls
        durationRange={durationRange}
        setDurationRange={setDurationRange}
        playbackRateRange={playbackRateRange}
        setPlaybackRateRange={setPlaybackRateRange}
        fadeRange={fadeRange}
        setFadeRange={setFadeRange}
      />

      <BlobDisplay events={blobEvents} />
    </div>
  );
};

export default AudioBlobularPlayer;
