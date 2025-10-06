import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import type { Range } from "../types/AudioBlobularPlayer.types";
import { useBlobularEngine } from "../hooks/useBlobularEngine";
import { useControls } from "../hooks/useControls";
import BlobPanel from "./BlobDisplay/BlobPanel";
import BlobControls from "./BlobControls/BlobControls";
import CompactWaveform from "./CompactWaveform/CompactWaveform";

import {
  getDurationRangeFromUrl,
  getPlaybackRateRangeFromUrl,
  getScaleFromUrl,
} from "@/shared/utils/url/urlHelpers";
import "./AudioBlobularPlayer.css";
import { useAudioSource } from "../engine";

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
  // Don't parse URL parameters initially - wait for buffer to load
  const {
    controls,
    setRangeControl,
    setNumBlobs,
    setSelectedScale,
    setControls,
    setPlaybackRate,
    setHasInitializedFromUrl,
  } = useControls();

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

  /**
   * Apply URL parameters after audio buffer is loaded
   * This ensures URL params are applied with correct buffer constraints
   */
  useEffect(() => {
    if (!buffer) return;

    setControls((prev) => {
      const next = { ...prev };

      // Update duration constraints and apply URL parameters
      const durationFromUrl = getDurationRangeFromUrl();
      if (durationFromUrl) {
        const [urlMin, urlMax] = durationFromUrl;
        // Clamp URL values to valid buffer range
        const clampedMin = Math.max(
          prev.duration.min,
          Math.min(urlMin, buffer.duration)
        );
        const clampedMax = Math.max(
          clampedMin,
          Math.min(urlMax, buffer.duration)
        );

        // Update URL if we had to clamp values
        if (urlMax > buffer.duration || urlMin !== clampedMin) {
          const params = new URLSearchParams(window.location.search);
          params.set(
            "duration",
            `${clampedMin.toFixed(2)}-${clampedMax.toFixed(2)}`
          );
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", newUrl);
        }

        next.duration = {
          ...prev.duration,
          range: [clampedMin, clampedMax],
          max: buffer.duration,
        };
      } else {
        // No URL params, just update max constraint
        next.duration = {
          ...prev.duration,
          max: buffer.duration,
        };
      }

      // Apply playback rate from URL
      const playbackRateFromUrl = getPlaybackRateRangeFromUrl();
      if (playbackRateFromUrl) {
        next.playbackRate = {
          ...prev.playbackRate,
          range: playbackRateFromUrl,
        };
      }

      // Apply scale from URL
      const scaleFromUrl = getScaleFromUrl();
      if (scaleFromUrl) {
        next.selectedScale = scaleFromUrl;
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
          key={`controls-${buffer?.duration || 0}`}
          bufferLength={buffer ? buffer.duration : 0}
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
