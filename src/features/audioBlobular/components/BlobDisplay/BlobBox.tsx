// src/components/BlobPanel/BlobBox.tsx
import { useRef, useEffect } from "react";
import type { BlobEvent } from "@/shared/types/types";
import { blobBox, inactive } from "./BlobBox.css";

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
      void el.offsetWidth;

      el.style.animationDuration = `${event.duration}s`;
      el.classList.add("fade-out");
    }
  }, [event]);

  const PANEL_WIDTH = window.innerWidth - 58 - 48; // width: calc(100vw - 58px); minus play button width 48 on blobChannel
  const rawOffset = event?.offset ?? 0;
  const dur = event?.duration ?? 0;
  const maxOffset = Math.max(0, bufferDuration - dur);
  const clampedOffset = Math.min(Math.max(rawOffset, 0), maxOffset);

  const bottom =
    Math.round(12 * Math.log2((event?.playbackRate ?? 0) + 1)) * 11 - 40; // Adjusted for better visibility

  const left =
    bufferDuration > 0 ? (clampedOffset / bufferDuration) * PANEL_WIDTH : 0;

  const width = bufferDuration
    ? ((event?.duration ?? 0) / bufferDuration) * 100
    : 0;

  return (
    <div
      ref={ref}
      className={event ? blobBox : `${blobBox} ${inactive}`}
      style={
        event
          ? {
              bottom: `${bottom}px`,
              left: `${left}px`,
              width: `${width}%`,
              borderRadius: `${(event.fadeTime ?? 0) * width}px`,
            }
          : undefined
      }
    >
      {event?.blobIndex != null ? event.blobIndex + 1 : null}
    </div>
  );
};

export default BlobBox;
