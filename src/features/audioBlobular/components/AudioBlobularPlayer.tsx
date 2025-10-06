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
import { useAudioBuffer } from "@/hooks/useAudioBuffer";

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

  const { blobularBuffer } = useAudioBuffer();

  const audioSource = useAudioSource();
  const buffer = audioSource.getBuffer();

  // Apply URL parameters after buffer is loaded
  useEffect(() => {
    if (!buffer) return;

    console.log("🎵 Buffer loaded, applying URL parameters...", {
      bufferDuration: buffer.duration,
    });

    setControls((prev) => {
      const next = { ...prev };

      // Update duration max to buffer length and clamp URL parameters if needed
      const durationFromUrl = getDurationRangeFromUrl();
      if (durationFromUrl) {
        const [urlMin, urlMax] = durationFromUrl;
        // Clamp URL values to valid range
        const clampedMin = Math.max(
          prev.duration.min,
          Math.min(urlMin, buffer.duration)
        );
        const clampedMax = Math.max(
          clampedMin,
          Math.min(urlMax, buffer.duration)
        );

        console.log("🎵 Clamping URL duration:", {
          original: [urlMin, urlMax],
          clamped: [clampedMin, clampedMax],
          bufferDuration: buffer.duration,
        });

        // If we had to clamp the values, update the URL to reflect the corrected parameters
        if (urlMax > buffer.duration || urlMin !== clampedMin) {
          const params = new URLSearchParams(window.location.search);
          params.set(
            "duration",
            `${clampedMin.toFixed(2)}-${clampedMax.toFixed(2)}`
          );
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", newUrl);
          console.log("🔧 Corrected URL parameters:", newUrl);
        }

        next.duration = {
          ...prev.duration,
          range: [clampedMin, clampedMax],
          max: buffer.duration,
        };
      } else {
        // No URL params, just update the max
        next.duration = {
          ...prev.duration,
          max: buffer.duration,
        };
      }

      // Apply playback rate from URL
      const playbackRateFromUrl = getPlaybackRateRangeFromUrl();
      if (playbackRateFromUrl) {
        console.log("🎵 Applying URL playback rate:", playbackRateFromUrl);
        next.playbackRate = {
          ...prev.playbackRate,
          range: playbackRateFromUrl,
        };
      }

      // Apply scale from URL
      const scaleFromUrl = getScaleFromUrl();
      if (scaleFromUrl) {
        console.log("🎵 Applying URL scale:", scaleFromUrl);
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
