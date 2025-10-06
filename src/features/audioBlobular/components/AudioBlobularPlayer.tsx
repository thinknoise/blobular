import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import type { Range } from "../types/AudioBlobularPlayer.types";
import { useBlobularEngine } from "../hooks/useBlobularEngine";
import { useControls } from "../hooks/useControls";
import BlobPanel from "./BlobDisplay/BlobPanel";
import BlobControls from "./BlobControls/BlobControls";
import CompactWaveform from "./CompactWaveform/CompactWaveform";

import { getInitialControlsFromUrl } from "@/shared/utils/url/urlHelpers";
import "./AudioBlobularPlayer.css";
import { useAudioSource } from "../engine";
import { useAudioBuffer } from "@/hooks/useAudioBuffer";

/**
 * AudioBlobularPlayer - Main audio synthesis interface
 *
 * This component uses a dual buffer system:
 * - useAudioBuffer(): Gets buffers from S3/AudioBufferProvider (for UI/URL handling)
 * - useAudioSource(): Legacy audio engine interface (for synthesis)
 * - Synchronization happens in useBlobularEngine via useEffect
 *
 * URL parameters are applied after buffer loads to ensure proper constraints.
 */

const AudioBlobularPlayer = () => {
  // Parse URL parameters early and use them for initial controls
  const initialControls = getInitialControlsFromUrl();
  
  const {
    controls,
    setRangeControl,
    setNumBlobs,
    setSelectedScale,
    setControls,
    setPlaybackRate,
    setHasInitializedFromUrl,
  } = useControls(initialControls);

  const { numBlobs, duration, playbackRate, fade, selectedScale } = controls;

  const { start, stop, blobEvents } = useBlobularEngine(
    numBlobs.value,
    duration.range,
    playbackRate.range,
    fade.range,
    selectedScale
  );

  const [isPlaying, setIsPlaying] = useState(false);

  const audioSource = useAudioSource();
  const buffer = audioSource.getBuffer();
  
  // Also check the AudioBufferProvider buffer for debugging
  const { blobularBuffer } = useAudioBuffer();
  
  console.log('AudioBlobularPlayer render - audioSource buffer:', buffer ? `${buffer.duration}s` : 'null');
  console.log('AudioBlobularPlayer render - blobularBuffer:', blobularBuffer ? `${blobularBuffer.duration}s` : 'null');
  console.log('AudioBlobularPlayer render - duration.range:', controls.duration.range);

  /**
   * Update duration constraints when audio buffer is loaded
   * URL parameters are already applied during initialization
   */
  useEffect(() => {
    if (!buffer) return;

    setControls((prev) => {
      const next = { ...prev };

      // Update duration max constraint based on buffer duration
      next.duration = {
        ...prev.duration,
        max: buffer.duration,
      };

      // Clamp current duration range to buffer length if needed
      const [currentMin, currentMax] = prev.duration.range;
      if (currentMax > buffer.duration) {
        const clampedMax = Math.min(currentMax, buffer.duration);
        const clampedMin = Math.min(currentMin, clampedMax);
        
        next.duration.range = [clampedMin, clampedMax];
        
        // Update URL if we had to clamp values
        const params = new URLSearchParams(window.location.search);
        params.set(
          "duration",
          `${clampedMin.toFixed(2)}-${clampedMax.toFixed(2)}`
        );
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);
      }

      return next;
    });

    // Enable URL updates for future control changes
    setHasInitializedFromUrl(true);
  }, [buffer, setControls, setHasInitializedFromUrl]);

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
          key={`controls-${buffer?.duration || blobularBuffer?.duration || 0}`}
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
