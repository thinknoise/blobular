import { useCallback, useMemo, useState } from "react";
import { Play, Square } from "lucide-react";
import type {
  ControlsState,
  Range,
} from "../types/AudioBlobularPlayer.types";
import { useBlobularEngine } from "../hooks/useBlobularEngine";
import { useControls } from "../hooks/useControls";
import BlobPanel from "./BlobDisplay/BlobPanel";
import BlobControls from "./BlobControls/BlobControls";
import CompactWaveform from "./CompactWaveform/CompactWaveform";

import "./AudioBlobularPlayer.css";
import { useAudioBuffer } from "@/hooks/useAudioBuffer";
import {
  buildControlsUrl,
  getInitialControlsFromSearch,
} from "../utils/controlUrlState";

/**
 * AudioBlobularPlayer - Main audio synthesis interface
 *
 * This component uses a dual buffer system:
 * - useAudioBuffer(): Gets buffers from AudioBufferProvider (for control bounds)
 * - useBlobularEngine(): Synchronizes the selected buffer into the audio engine
 *
 * URL parameters are applied after buffer loads to ensure proper constraints.
 */

const AudioBlobularPlayer = () => {
  const initialControls = useMemo(
    () => getInitialControlsFromSearch(window.location.search),
    []
  );

  const syncControlsToUrl = useCallback((nextControls: ControlsState) => {
    const nextUrl = buildControlsUrl(
      window.location.pathname,
      window.location.search,
      nextControls
    );
    window.history.replaceState({}, "", nextUrl);
  }, []);

  const { blobularBuffer } = useAudioBuffer();

  const {
    controls,
    setRangeControl,
    setNumBlobs,
    setSelectedScale,
    setPlaybackRate,
  } = useControls({
    initial: initialControls,
    bufferDuration: blobularBuffer?.duration,
    onCommittedControlsChange: syncControlsToUrl,
  });

  const { numBlobs, duration, playbackRate, fade, selectedScale } = controls;

  const { start, stop, blobEvents } = useBlobularEngine(
    numBlobs.value,
    duration.range,
    playbackRate.range,
    fade.range,
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
    <div
      className={
        isPlaying ? "audio-blobular-player playing" : "audio-blobular-player"
      }
    >
      <div className="blob-channel">
        <button
          className={`play-button individual ${isPlaying ? "playing" : ""}`}
          onClick={handleClick}
          aria-label={isPlaying ? "Stop playback" : "Start playback"}
        >
          {isPlaying ? <Square /> : <Play />}
        </button>
        <div className="blobular-visualizer">
          <BlobPanel blobEvents={blobEvents} />
          <CompactWaveform />
        </div>

        <BlobControls
          key={`controls-${blobularBuffer?.duration || 0}`}
          bufferLength={blobularBuffer ? blobularBuffer.duration : 0}
          duration={{
            ...controls.duration,
            setRange: (r: Range) => setRangeControl("duration", r),
            commitRange: controls.duration.commitRange,
          }}
          fade={{
            ...controls.fade,
            setRange: (r: Range) => setRangeControl("fade", r),
            commitRange: controls.fade.commitRange,
          }}
          playbackRate={{
            ...controls.playbackRate,
            setRange: setPlaybackRate,
            commitRange: controls.playbackRate.commitRange,
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
    </div>
  );
};

export default AudioBlobularPlayer;
