import React, { useRef, useState } from "react";
import { WaveformViewer } from "@/features/audioBlobular/components";
import { AudioLines, CloudCogIcon, Play, Square } from "lucide-react";
import {
  saveButton,
  selectButton,
  playButton,
  recordedItem,
} from "./Items.css"; // Import the styles

interface RecordedItemProps {
  recording: {
    url: string;
    blob: Blob;
  };
  onSave: (blob: Blob) => void;
  onSelect?: (blob: Blob) => void;
}

const RecordedItem: React.FC<RecordedItemProps> = ({
  recording,
  onSave,
  onSelect,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else {
      audioRef.current.play();
    }
  };

  return (
    <div className={recordedItem}>
      <audio
        ref={audioRef}
        src={recording.url}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        hidden
      />
      <button className={playButton} onClick={togglePlay}>
        {isPlaying ? <Square /> : <Play />}
      </button>
      {onSelect && (
        <button
          className={selectButton}
          onClick={() => onSelect(recording.blob)}
        >
          <AudioLines />
        </button>
      )}
      <button className={saveButton} onClick={() => onSave(recording.blob)}>
        <CloudCogIcon size={32} />
      </button>
      <WaveformViewer audioUrl={recording.url} />
    </div>
  );
};

export default RecordedItem;
