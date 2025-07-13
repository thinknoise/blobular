import { useEffect, useState } from "react";
import type { Range } from "./AudioBlobularPlayer.types";

import { useBlobularEngine } from "../../hooks/useBlobularEngine";
import {
  // BlobDisplay,
  BlobControls,
  BlobPanel,
  CompactWaveform,
} from "../BlobDisplay";
import { useControls } from "../../hooks/useControls";
import { Play, Square } from "lucide-react";

import "./AudioBlobularPlayer.css";

const AudioBlobularPlayer = () => {
  const { controls, setRangeControl, setNumBlobs, setSelectedScale } =
    useControls();

  const { numBlobs, duration, playbackRate, fade, selectedScale } = controls;

  const { start, stop, blobEvents, buffer } = useBlobularEngine(
    numBlobs.value,
    duration.range,
    playbackRate.range,
    fade.range,
    selectedScale
  );

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    console.log("Buffer updated:", buffer);
    duration.max = buffer ? buffer.duration : 10;
    duration.range = [0.8, Math.min(8.8, duration.max)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer]);

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
      <span className="blobular-title-chunk">Blobul</span>
      {isPlaying ? <Square /> : <Play />}
      <span className="blobular-title-chunk">r</span>

      <div className="blobular-visualizer">
        <BlobPanel
          blobEvents={blobEvents}
          bufferDuration={buffer ? buffer.duration : 0}
        />
        {buffer && <CompactWaveform buffer={buffer} />}
        <button
          className={
            isPlaying
              ? "play-button individual playing"
              : "play-button individual"
          }
          onClick={handleClick}
        >
          {isPlaying ? <Square /> : <Play />}
        </button>
      </div>

      <BlobControls
        duration={{
          ...controls.duration,
          setRange: (r) => setRangeControl("duration", r),
        }}
        fade={{
          ...controls.fade,
          setRange: (r: Range) => setRangeControl("fade", r),
        }}
        playbackRate={{
          ...controls.playbackRate,
          setRange: (r: Range) => setRangeControl("playbackRate", r),
        }}
        numBlobs={{
          ...controls.numBlobs,
          setValue: setNumBlobs,
        }}
        selectedScale={{
          value: controls.selectedScale,
          setValue: setSelectedScale,
        }}
      />

      {/* <BlobDisplay events={blobEvents} /> */}
    </div>
  );
};

export default AudioBlobularPlayer;
