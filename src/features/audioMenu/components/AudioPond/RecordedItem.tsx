import React, { useRef, useState } from "react";
import clsx from "clsx";
import { WaveformViewer } from "@/features/audioBlobular/components";
import { AudioLines, CloudCogIcon, Play, Square } from "lucide-react";
import {
  audioItem,
  iconButton,
  saveButton,
  selectButton,
  playButton,
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
    <div className={clsx(audioItem, "recorded-item")}>
      <audio
        ref={audioRef}
        src={recording.url}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        hidden
      />
      <button className={clsx(iconButton, playButton)} onClick={togglePlay}>
        {isPlaying ? <Square /> : <Play />}
      </button>
      {onSelect && (
        <button
          className={clsx(iconButton, selectButton)}
          onClick={() => onSelect(recording.blob)}
        >
          <AudioLines />
        </button>
      )}
      <button
        className={clsx(iconButton, saveButton)}
        onClick={() => onSave(recording.blob)}
      >
        <CloudCogIcon size={32} />
      </button>
      <WaveformViewer audioUrl={recording.url} />
    </div>
  );
};

export default RecordedItem;
