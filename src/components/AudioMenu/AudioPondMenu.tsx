// src/components/AudioPondMenu.tsx
import React, { useEffect } from "react";
import CompactWaveform from "../BlobDisplay/CompactWaveform";
import { useAudioBuffer } from "../../hooks/useAudioBuffer";

import { useAudioPond } from "../../hooks/useAudioPond";
import { listAudioKeys } from "../../utils/awsS3Helpers";

import "./AudioPondMenu.css";

interface AudioPondMenuProps {
  toggleMenu: () => void;
  isOpen: boolean;
  closeThisMenu?: () => void;
}

const AudioPondMenu: React.FC<AudioPondMenuProps> = ({
  toggleMenu,
  isOpen,
  closeThisMenu,
}) => {
  const { blobularBuffer, setBlobularBuffer } = useAudioBuffer();

  const { buffers, fetchAudioKeysAndBuffers } = useAudioPond();

  useEffect(() => {
    listAudioKeys();
    fetchAudioKeysAndBuffers();
  }, []);

  return (
    <div className={`audio-pond-menu ${isOpen ? "open" : ""}`}>
      <button className="menu-button" aria-label="Menu" onClick={toggleMenu}>
        ☰
      </button>
      <ul className="audio-list">
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
                if (closeThisMenu) {
                  closeThisMenu(); // Close menu after selection
                }
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
