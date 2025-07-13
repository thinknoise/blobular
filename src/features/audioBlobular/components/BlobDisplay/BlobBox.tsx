// src/components/BlobPanel/BlobBox.tsx
import { useRef, useEffect } from "react";
import type { BlobEvent } from "../../types/types";
import "./BlobBox.css";

type BlobBoxProps = {
  event: BlobEvent | null;
  index: number;
  bufferDuration: number;
};

const BlobBox = ({ event, bufferDuration }: BlobBoxProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (event && ref.current) {
      const el = ref.current;

      // reset opacity & animation
      el.classList.remove("fade-out");
      void el.offsetWidth; // force reflow

      // set dynamic duration
      el.style.animationDuration = `${event.duration}s`;

      // start fade-out
      el.classList.add("fade-out");
    }
  }, [event]);

  // compute positioning

  // width of your panel in px
  const PANEL_WIDTH = 800; // todo: need to match your CSS width which should be set in BlobBox.css

  // raw values
  const rawOffset = event?.offset ?? 0;
  const dur = event?.duration ?? 0;

  // compute the maximum allowed offset so that offset + duration ≤ bufferDuration
  const maxOffset = Math.max(0, bufferDuration - dur);

  // clamp the raw offset into [0, maxOffset]
  const clampedOffset = Math.min(Math.max(rawOffset, 0), maxOffset);

  // finally map into pixels
  const left =
    bufferDuration > 0 ? (clampedOffset / bufferDuration) * PANEL_WIDTH : 0;

  const width = bufferDuration
    ? ((event?.duration ?? 0) / bufferDuration) * 100
    : 0;

  return event ? (
    <div
      ref={ref}
      className="blob-box"
      style={{
        bottom: `${Math.round(12 * Math.log2(event.playbackRate ?? 1)) * 5}px`,
        left: `${left}px`,
        width: `${width}%`,
        borderRadius: `${(event.fadeTime ?? 0) * width}px`,
      }}
    >
      {event.blobIndex + 1}
    </div>
  ) : (
    <div className="blob-box inactive"></div>
  );
};

export default BlobBox;
