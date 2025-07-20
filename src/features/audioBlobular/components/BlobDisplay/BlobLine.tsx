import { useEffect, useRef } from "react";
import type { BlobEvent } from "@/shared/types/types";
import "./BlobDisplay.css";

type BlobLineProps = {
  event: BlobEvent | null;
  index: number;
};

const BlobLine = ({ event, index }: BlobLineProps) => {
  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (event && divRef.current) {
      const el = divRef.current;

      // Remove fade-out class to reset animation
      el.classList.remove("fade-out");

      // Trigger reflow to ensure removal is registered
      void el.offsetWidth;

      // Re-add fade-out class to start animation
      el.classList.add("fade-out");
    }
  }, [event]);

  return event ? (
    <div
      ref={divRef}
      className="blob-line"
      style={{
        animationDuration: `${event.duration}s`,
      }}
    >
      {event.blobIndex} | startAt: {event.offset.toFixed(2)} | Dur:{" "}
      {event.duration.toFixed(2)} | Rate: {event.playbackRate.toFixed(2)}
    </div>
  ) : (
    <div className="blob-line inactive">⚫ Blob {index} inactive</div>
  );
};

export default BlobLine;
