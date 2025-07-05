import type { BlobEvent } from "../AudioBlobularPlayer/types";

type BlobDisplayProps = {
  events: BlobEvent[];
};

const BlobDisplay = ({ events }: BlobDisplayProps) => {
  return (
    <div style={{ fontFamily: "monospace", maxHeight: 300, overflowY: "auto" }}>
      {events.map((e, i) => (
        <div key={i}>
          {i} Blob {e.blobIndex} | Time: {e.scheduledTime.toFixed(2)} | Dur:{" "}
          {e.duration.toFixed(2)} | Rate: {e.playbackRate.toFixed(2)}
        </div>
      ))}
    </div>
  );
};

export default BlobDisplay;
