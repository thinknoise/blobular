// src/components/BlobPanel.tsx
import type { BlobEvent } from "@/shared/types/types";
import BlobBox from "./BlobBox";
import "./BlobBox.css";
import { useAudioSource } from "../../engine";

type BlobPanelProps = {
  blobEvents: (BlobEvent | null)[];
};

const BlobPanel = ({ blobEvents }: BlobPanelProps) => {
  const audioSource = useAudioSource();
  const buffer = audioSource.getBuffer();
  const bufferDuration = buffer ? buffer.duration : 0;

  return (
    <div className="blob-box-container">
      {blobEvents.map((e, i) => (
        <BlobBox key={i} event={e} index={i} bufferDuration={bufferDuration} />
      ))}
    </div>
  );
};

export default BlobPanel;
