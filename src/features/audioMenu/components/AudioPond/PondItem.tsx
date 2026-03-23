import React, { useRef, useState } from "react";
import { WaveformViewer } from "@/features/audioBlobular/components";
import type { SoundRecord } from "@/features/sounds/types";
import { getSoundListLabel } from "@/features/sounds/utils/soundMetadata";
import {
  AudioLines,
  Play,
  Square,
  //  Trash2
} from "lucide-react";
import { getAudioCtx } from "@/shared";
import {
  audioItem,
  audioLabel,
  loadingSpinner,
  errorText,
  selectButton,
  playButton,
  // deleteButton,
} from "./Items.css"; // Import the styles

interface PondItemProps {
  sound: SoundRecord;
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
  sound,
  status,
  isSelected,
  onSelect,
  // onDelete,
}) => {
  const [audioContext] = useState(() => getAudioCtx());
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playBuffer = () => {
    if (!status.buffer) return;

    if (isPlaying && sourceRef.current) {
      sourceRef.current.stop();
      setIsPlaying(false);
      console.log(`Stopped playing buffer for key: ${sound.storageKey}`);
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
    console.log(`Playing buffer for key: ${sound.storageKey}`);
  };

  return (
    <li className={isSelected ? audioItem + " playing" : audioItem}>
      {/* <button className={deleteButton} onClick={onDelete}>
        <Trash2 />
      </button> */}
      <button className={selectButton} onClick={onSelect}>
        <AudioLines />
      </button>

      <button className={playButton} onClick={playBuffer}>
        {isPlaying ? <Square /> : <Play />}
      </button>

      {status.loading && !status.buffer && (
        <span className={loadingSpinner}>Loading...</span>
      )}

      {status.error && (
        <span className={errorText}>Failed to load: {status.error}</span>
      )}
      {status.buffer && <WaveformViewer buffer={status.buffer} />}
      <span className={audioLabel}>{getSoundListLabel(sound)}</span>
    </li>
  );
};

export default PondItem;
