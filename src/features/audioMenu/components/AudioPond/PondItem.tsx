import React, { useRef, useState } from "react";
import { WaveformViewer } from "@/features/audioBlobular/components";
import { AudioLines, Play, Square, Trash2 } from "lucide-react";
import "./Items.css"; // Ensure you have styles for the PondItem

interface PondItemProps {
  keyName: string;
  status: {
    loading: boolean;
    error: boolean;
    buffer: AudioBuffer | null;
  };
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void; // Optional delete handler
}

const PondItem: React.FC<PondItemProps> = ({
  keyName,
  status,
  isSelected,
  onSelect,
  onDelete,
}) => {
  const filename = keyName.replace(/^.*\//, "");
  const [audioContext] = useState(() => new AudioContext());
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playBuffer = () => {
    if (!status.buffer) return;

    if (isPlaying && sourceRef.current) {
      sourceRef.current.stop();
      setIsPlaying(false);
      console.log(`Stopped playing buffer for key: ${keyName}`);
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = status.buffer;
    source.connect(audioContext.destination);

    source.onended = () => {
      setIsPlaying(false);
      sourceRef.current = null;
    };

    source.start();
    sourceRef.current = source;
    setIsPlaying(true);
    console.log(`Playing buffer for key: ${keyName}`);
  };

  return (
    <li className={isSelected ? "audio-item playing" : "audio-item"}>
      <button className="icon-button delete-button" onClick={onDelete}>
        <Trash2 />{" "}
      </button>
      <button className="icon-button select-button" onClick={onSelect}>
        <AudioLines />
      </button>

      <button className="icon-button play-button" onClick={playBuffer}>
        {isPlaying ? <Square /> : <Play />}
      </button>

      {status.loading && <span className="loading-spinner">Loading...</span>}

      {status.error && (
        <span className="error-text">Failed to load: {status.error}</span>
      )}
      {status.buffer && <WaveformViewer buffer={status.buffer} />}
      <span className="audio-label">{filename}</span>
    </li>
  );
};

export default PondItem;
