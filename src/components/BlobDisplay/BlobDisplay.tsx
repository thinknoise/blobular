// BlobDisplay.tsx

import type { BlobEvent } from "../AudioBlobularPlayer/types";
import "./BlobDisplay.css";

type BlobDisplayProps = {
  events: BlobEvent[];
};

const BlobDisplay = ({ events }: BlobDisplayProps) => {
  return (
    <div className="blob-display">
      {events.map((e, i) => (
        <div key={i}>
          Blob {e.blobIndex} | Time: {e.scheduledTime.toFixed(2)} | Dur:{" "}
          {e.duration.toFixed(2)} | Rate: {e.playbackRate.toFixed(2)}
        </div>
      ))}
    </div>
  );
};

export default BlobDisplay;
