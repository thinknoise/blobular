import { useEffect, useState } from "react";
import type { Range } from "../types/AudioBlobularPlayer.types";

import { useBlobularEngine } from "../hooks/useBlobularEngine";
import BlobPanel from "./BlobDisplay/BlobPanel";
import BlobControls from "./BlobControls/BlobControls";
import CompactWaveform from "./CompactWaveform/CompactWaveform";
import { useControls } from "../hooks/useControls";
import { Play, Square } from "lucide-react";

import {
  getDurationRangeFromUrl,
  getInitialControlsFromUrl,
  getPlaybackRateRangeFromUrl,
} from "@/shared/utils/url/urlHelpers";
import "./AudioBlobularPlayer.css";

const AudioBlobularPlayer = () => {
  const initialControls = getInitialControlsFromUrl();
  const {
    controls,
    setRangeControl,
    setNumBlobs,
    setSelectedScale,
    setControls,
    hasInitializedFromUrl,
    setHasInitializedFromUrl,
  } = useControls(initialControls);

  const { numBlobs, duration, playbackRate, fade, selectedScale } = controls;

  const { start, stop, blobEvents, buffer } = useBlobularEngine(
    numBlobs.value,
    duration.range,
    playbackRate.range,
    fade.range,
    selectedScale
  );

  const [isPlaying, setIsPlaying] = useState(false);

  function getBlobNumberFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get("blobs");
  }

  useEffect(() => {
    const blobNumber = getBlobNumberFromUrl();
    const durationFromUrl = getDurationRangeFromUrl();
    const playbackRateFromUrl = getPlaybackRateRangeFromUrl();

    if (blobNumber) {
      const num = parseInt(blobNumber, 10);
      if (!isNaN(num) && num >= 1 && num <= 12) {
        setNumBlobs(num);
      } else {
        console.warn("Invalid blob number in URL, using default (8)");
      }
    }

    if (!hasInitializedFromUrl) {
      if (durationFromUrl) {
        setControls((prev) => ({
          ...prev,
          duration: {
            ...prev.duration,
            range: durationFromUrl,
          },
        }));
      }
      setHasInitializedFromUrl(true);
    }

    if (playbackRateFromUrl) {
      setControls((prev) => ({
        ...prev,
        playbackRate: {
          ...prev.playbackRate,
          range: playbackRateFromUrl,
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (buffer) {
      const newMax = buffer.duration; // fallback if buffer not ready
      const newMin = duration.range[0];

      // no URL param, so derive from buffer
      const clampedEnd = Math.min(3.5, newMax);
      setControls((prev) => ({
        ...prev,
        duration: {
          ...prev.duration,
          range: [0.8, clampedEnd],
          max: newMax,
          min: newMin,
        },
      }));
    }
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
    <div
      className={
        isPlaying ? "audio-blobular-player playing" : "audio-blobular-player"
      }
    >
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
          setRange: (r: Range) => setRangeControl("duration", r),
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
