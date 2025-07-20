import React, { useRef, useState } from "react";
import { WaveformViewer } from "@/features/audioBlobular/components";
import { AudioLines, CloudCogIcon, Play, Square } from "lucide-react";
import "./Items.css"; // Ensure you have styles for the recorded item

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
    <div className="audio-item recorded-item">
      <audio
        ref={audioRef}
        src={recording.url}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        hidden
      />
      <button className="icon-button play-button" onClick={togglePlay}>
        {isPlaying ? <Square /> : <Play />}
      </button>
      {onSelect && (
        <button
          className="icon-button select-button"
          onClick={() => onSelect(recording.blob)}
        >
          <AudioLines />
        </button>
      )}
      <button
        className="icon-button save-button"
        onClick={() => onSave(recording.blob)}
      >
        <CloudCogIcon size={32} />
      </button>
      <WaveformViewer audioUrl={recording.url} />
    </div>
  );
};

export default RecordedItem;
