import { useState } from "react";
import { useBlobularEngine } from "./useBlobularEngine";
import { BlobDisplay, BlobControls } from "../BlobDisplay";
import CompactWaveform from "../BlobDisplay/CompactWaveform";

const AudioBlobularPlayer = () => {
  const [durationRange, setDurationRange] = useState<[number, number]>([
    0.8, 8.8,
  ]);
  const [playbackRateRange, setPlaybackRateRange] = useState<[number, number]>([
    0.9, 1.4,
  ]);
  const [fadeRange, setFadeRange] = useState<[number, number]>([0.1, 1.0]);

  const { start, stop, blobEvents, buffer } = useBlobularEngine(
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
      {buffer && (
        <CompactWaveform
          buffer={buffer}
          width={480} // whatever you need
          height={300}
        />
      )}
    </div>
  );
};

export default AudioBlobularPlayer;
