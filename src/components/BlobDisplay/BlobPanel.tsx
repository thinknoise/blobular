// src/components/BlobPanel.tsx
import type { BlobEvent } from "../AudioBlobularPlayer/types";
import "./BlobPanel.css";
import BlobBox from "./BlobBox";

type BlobPanelProps = {
  blobEvents: (BlobEvent | null)[];
  bufferDuration?: number;
};

const BlobPanel = ({ blobEvents, bufferDuration = 0 }: BlobPanelProps) => {
  return (
    <div className="blob-box-container">
      {blobEvents.map((e, i) => (
        <BlobBox key={i} event={e} index={i} bufferDuration={bufferDuration} />
      ))}
    </div>
  );
};

export default BlobPanel;
