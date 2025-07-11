// src/components/AudioPondMenu.tsx
import React, { useEffect, useState } from "react";
import CompactWaveform from "../BlobDisplay/CompactWaveform";
import { useAudioBuffer } from "../../hooks/useAudioBuffer";

import { useAudioPond } from "../../hooks/useAudioPond";
import { listAudioKeys } from "../../utils/awsS3Helpers";

import "./AudioPondMenu.css";
import RecordUpload from "./AudioPond/RecordUpload";

const AudioPondMenu: React.FC = () => {
  const { blobularBuffer, setBlobularBuffer } = useAudioBuffer();

  const { buffers, fetchAudioKeysAndBuffers } = useAudioPond();
  const [pondMenuOpen, setPondMenuOpen] = useState(false);

  const togglePondMenu = () => {
    setPondMenuOpen(!pondMenuOpen);
  };

  useEffect(() => {
    listAudioKeys();
    fetchAudioKeysAndBuffers();
  }, []);

  return (
    <div className={`audio-pond-menu ${pondMenuOpen ? "open" : ""}`}>
      <button
        className="menu-button"
        aria-label="Menu"
        onClick={togglePondMenu}
      >
        ☰
      </button>
      <ul className="audio-list">
        <RecordUpload />
        {Object.entries(buffers).map(([key, status]) => (
          <li
            key={key}
            className={
              blobularBuffer === status.buffer
                ? "audio-item playing"
                : "audio-item"
            }
            onClick={() => {
              if (status.buffer) {
                console.log(`Setting buffer for key: ${key}`, status.buffer);
                setBlobularBuffer(status.buffer);
                setPondMenuOpen(false); // Close the menu when an audio is selected
              }
            }}
          >
            <span className="audio-label">{key.replace(/^.*\//, "")}</span>

            {status.loading && (
              <span className="loading-spinner">Loading...</span>
            )}

            {status.error && <span className="error-text">Failed to load</span>}

            {status.buffer && (
              <CompactWaveform buffer={status.buffer} customHeight={150} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AudioPondMenu;
