// src/components/AudioPondMenu.tsx
import React, { useEffect, useState } from "react";
import { listAudioKeys, getAudioArrayBuffer } from "../../utils/awsS3Helpers";
import CompactWaveform from "../BlobDisplay/CompactWaveform";
import { useAudioBuffer } from "../../hooks/useAudioBuffer";
import { getAudioCtx } from "../../utils/audioCtx";

import "./AudioPondMenu.css";
import ButtonUpload from "./AudioPond/ButtonUpload";

type BufferStatus = {
  loading: boolean;
  buffer?: AudioBuffer;
  error?: string;
};

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
  const [buffers, setBuffers] = useState<Record<string, BufferStatus>>({});

  const { blobularBuffer, setBlobularBuffer } = useAudioBuffer();

  const fetchAudioKeysAndBuffers = async () => {
    const keys = await listAudioKeys();

    const initialMap: Record<string, BufferStatus> = {};
    keys.forEach((key) => {
      initialMap[key] = { loading: true };
    });
    setBuffers(initialMap);

    for (const key of keys) {
      try {
        // console.log(`Fetching audio data for key: ${key}`);
        const arrayBuffer = await getAudioArrayBuffer(key);
        const audioCtx = getAudioCtx();
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);

        setBuffers((prev) => ({
          ...prev,
          [key]: { buffer: decoded, loading: false },
        }));

        // console.log(`Finished decoding: ${key}`);
      } catch (err) {
        console.error(`Failed to load ${key}`, err);
        setBuffers((prev) => ({
          ...prev,
          [key]: { loading: false, error: String(err) },
        }));
      }
    }
  };

  useEffect(() => {
    fetchAudioKeysAndBuffers();
  }, []);

  const handleUploadComplete = (key: string) => {
    console.log("Uploaded file key:", key);
    // Update your registry or UI state here
    fetchAudioKeysAndBuffers(); // Refresh the list after upload
  };

  return (
    <div className={`audio-pond-menu ${isOpen ? "open" : ""}`}>
      <button className="menu-button" aria-label="Menu" onClick={toggleMenu}>
        ☰
      </button>
      <ButtonUpload onUpload={handleUploadComplete} />
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
              <CompactWaveform buffer={status.buffer} customHeight={50} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AudioPondMenu;
