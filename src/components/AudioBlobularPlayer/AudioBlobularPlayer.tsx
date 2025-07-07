import { useState } from "react";
import { useBlobularEngine } from "./useBlobularEngine";
import {
  BlobDisplay,
  BlobControls,
  BlobPanel,
  CompactWaveform,
} from "../BlobDisplay";
import { ALL_SCALES, type ScaleName } from "../constants/scales";
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
    fadeRange
  );

  return (
    <div className="audio-blobular-player">
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>

      <div className="blobular-visualizer">
        <BlobPanel
          blobEvents={blobEvents}
          bufferDuration={buffer ? buffer.duration : 0}
        />
        {buffer && (
          <CompactWaveform
            buffer={buffer}
            width={400} // whatever you need
            height={300}
          />
        )}
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
