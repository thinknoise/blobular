import type { BlobEvent } from "../AudioBlobularPlayer/types";
import BlobLine from "./BlobLine";
import "./BlobDisplay.css";

type BlobDisplayProps = {
  events: (BlobEvent | null)[];
};

const BlobDisplay = ({ events }: BlobDisplayProps) => {
  return (
    <div className="blob-display">
      {events.map((e, i) => (
        <BlobLine key={i} event={e} index={i} />
      ))}
    </div>
  );
};

export default BlobDisplay;
