// src/components/AudioPondMenu.tsx
import React, { useEffect, useState } from "react";
import { listAudioKeys, getAudioArrayBuffer } from "../../utils/awsS3Helpers";
import CompactWaveform from "../BlobDisplay/CompactWaveform";
import "./AudioPondMenu.css";

const AudioPondMenu: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [buffers, setBuffers] = useState<Record<string, AudioBuffer>>({});

  useEffect(() => {
    listAudioKeys().then(async (keys) => {
      // For each key, fetch & decode the buffer
      const decodedMap: Record<string, AudioBuffer> = {};
      for (const key of keys) {
        const arrayBuffer = await getAudioArrayBuffer(key);
        const audioCtx = new AudioContext();
        decodedMap[key] = await audioCtx.decodeAudioData(arrayBuffer);
      }
      setBuffers(decodedMap);
    });
  }, []);

  return (
    <div className={`audio-pond-menu ${menuOpen ? "open" : ""}`}>
      <button
        className="menu-button"
        aria-label="Menu"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>
      <ul className="audio-list">
        {Object.entries(buffers).map(([key, buffer]) => (
          <li key={key} className="audio-item">
            <span className="audio-label">{key.replace(/^.*\//, "")}</span>
            <CompactWaveform buffer={buffer} customHeight={50} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AudioPondMenu;
