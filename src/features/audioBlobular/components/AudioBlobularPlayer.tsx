import { useEffect, useState } from "react";
import { controlLimits } from "@/shared/constants/controlLimits";
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
  getScaleFromUrl,
} from "@/shared/utils/url/urlHelpers";
import "./AudioBlobularPlayer.css";
import { useAudioSource } from "../engine";

const AudioBlobularPlayer = () => {
  const initialControls = getInitialControlsFromUrl();
  const {
    controls,
    setRangeControl,
    setNumBlobs,
    setSelectedScale,
    setControls,
    setPlaybackRate,
    hasInitializedFromUrl,
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

  function getBlobNumberFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get("blobs");
  }

  useEffect(() => {
    if (hasInitializedFromUrl) return;

    const blobNumber = getBlobNumberFromUrl();
    const durationFromUrl = getDurationRangeFromUrl();
    const playbackRateFromUrl = getPlaybackRateRangeFromUrl();
    const scaleFromUrl = getScaleFromUrl();

    if (blobNumber) {
      const num = parseInt(blobNumber, 10);
      if (!isNaN(num) && num >= 1 && num <= controlLimits.MAX_BLOBS) {
        setNumBlobs(num);
      } else {
        console.warn("Invalid blob number in URL, using default (8)");
      }
    }

    setControls((prev) => {
      const next = { ...prev };

      if (durationFromUrl) {
        next.duration = {
          ...prev.duration,
          range: durationFromUrl,
        };
      }

      if (playbackRateFromUrl) {
        next.playbackRate = {
          ...prev.playbackRate,
          range: playbackRateFromUrl,
        };
      }
      next.selectedScale = scaleFromUrl ?? controlLimits.DEFAULT_SCALE;
      return next;
    });

    setHasInitializedFromUrl(true);
  }, []);

  const audioSource = useAudioSource();
  const buffer = audioSource.getBuffer();

  useEffect(() => {
    if (!buffer) return;

    const newMax = buffer.duration;
    const clampedEnd = Math.min(duration.range[1], newMax);

    setControls((prev) => ({
      ...prev,
      duration: {
        ...prev.duration,
        range: [controlLimits.DEFAULT_DURATION_RANGE[0], clampedEnd],
        max: newMax,
        min: prev.duration.range[0],
      },
    }));
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
        <BlobPanel blobEvents={blobEvents} />
        <CompactWaveform />
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
          setRange: setPlaybackRate,
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
