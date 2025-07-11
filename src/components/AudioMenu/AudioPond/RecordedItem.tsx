import React, { useRef, useState } from "react";
import WaveformViewer from "../../AudioBlobularPlayer/WaveformViewer";
import { CloudCogIcon, Play, Square } from "lucide-react";
import "./RecordedItem.css"; // Ensure you have styles for the recorded item

interface RecordedItemProps {
  recording: {
    url: string;
    blob: Blob;
  };
  onSave: (blob: Blob) => void;
}

const RecordedItem: React.FC<RecordedItemProps> = ({ recording, onSave }) => {
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
    <div className="recorded-item">
      <audio
        ref={audioRef}
        src={recording.url}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        hidden
      />
      <button className="recorded-play-button" onClick={togglePlay}>
        {isPlaying ? <Square /> : <Play />}
      </button>
      <button
        className="recorded-save-button"
        onClick={() => onSave(recording.blob)}
      >
        <CloudCogIcon size={32} />
      </button>
      <WaveformViewer audioUrl={recording.url} />
    </div>
  );
};

export default RecordedItem;
