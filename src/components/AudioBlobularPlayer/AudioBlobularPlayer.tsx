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

import {
  getDurationRangeFromUrl,
  getInitialControlsFromUrl,
} from "../../utils/urlHelpers";
import "./AudioBlobularPlayer.css";

const AudioBlobularPlayer = () => {
  const initialControls = getInitialControlsFromUrl();
  const { controls, setRangeControl, setNumBlobs, setSelectedScale } =
    useControls(initialControls);

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
    if (blobNumber) {
      const num = parseInt(blobNumber, 10);
      if (!isNaN(num) && num >= 1 && num <= 12) {
        setNumBlobs(num);
      } else {
        console.warn("Invalid blob number in URL, using default (8)");
      }
    }

    const durationFromUrl = getDurationRangeFromUrl();
    if (durationFromUrl) {
      console.log("Duration from URL:", durationFromUrl);
      setRangeControl("duration", durationFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      const params = new URLSearchParams(window.location.search);

      // Add blobs param
      params.set("blobs", numBlobs.value.toString());

      // Add duration param (e.g. "1.1,2.8")
      const [min, max] = controls.duration.range;
      params.set("duration", `${min.toFixed(2)},${max.toFixed(2)}`);

      // Update URL without reload
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [numBlobs.value, controls.duration.range]);

  useEffect(() => {
    const newMax = buffer ? buffer.duration : 10;
    const clampedEnd = Math.min(8.8, newMax);

    duration.setRange([0.8, clampedEnd]);
    duration.max = newMax;
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
