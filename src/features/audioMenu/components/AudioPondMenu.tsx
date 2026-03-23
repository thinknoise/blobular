// src/components/AudioPondMenu.tsx
import React, { useEffect, useRef, useState } from "react";

import { getAudioCtx } from "@/shared/utils/audio/audioCtx";
import { getDisplayTitle, setPageTitle } from "@/shared/utils/url/urlHelpers";

import { useAudioBuffer } from "@/hooks/useAudioBuffer";
import { useAudioPond } from "../hooks/useAudioPond";
import { useRecording } from "../hooks/useRecording";

import ButtonRecord from "./AudioPond/ButtonRecord";
import RecordedItem from "./AudioPond/RecordedItem";
import PondItem from "./AudioPond/PondItem";

import { ArrowLeftFromLine, ArrowRightFromLine, FileAudio } from "lucide-react";
import "./AudioPondMenu.css";
import "./AudioPond/Button.css";
import ButtonUpload from "./AudioPond/ButtonUpload";

function useRecordingLoop(
  isRecording: boolean,
  handleUpdateRecordedBuffer: () => void,
  interval = 1000
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(async () => {
        if (isUpdatingRef.current) return;
        isUpdatingRef.current = true;
        try {
          await handleUpdateRecordedBuffer();
        } finally {
          isUpdatingRef.current = false;
        }
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording, handleUpdateRecordedBuffer, interval]);
}

function updateBufferKeyInUrl(key: string | null): void {
  const params = new URLSearchParams(window.location.search);

  if (key) {
    params.set("buffer", key);
  } else {
    params.delete("buffer");
  }

  const queryString = params.toString();
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;
  window.history.replaceState(null, "", newUrl);
}

const AudioPondMenu: React.FC = () => {
  const { blobularBufferKey, setBlobularBuffer } = useAudioBuffer();

  const {
    buffers,
    isLoading,
    isUploading,
    error,
    clearError,
    uploadRecordedBlob,
    deleteAudioItem,
  } = useAudioPond();
  const [pondMenuOpen, setPondMenuOpen] = useState(false);

  const audioContext = getAudioCtx();
  const {
    isRecording,
    startRecording,
    stopRecording,
    updateWavBlob,
    setInputGain,
    inputGain,
  } = useRecording(audioContext);
  const [recordings, setRecordings] = useState<{ url: string; blob: Blob }[]>(
    []
  );
  const [updatingRecording, setUpdatingRecording] = useState(false);
  const hasInitializedFromS3 = useRef(false);

  const togglePondMenu = () => {
    setPondMenuOpen(!pondMenuOpen);
  };

  function getBufferKeyFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get("buffer");
  }

  useEffect(() => {
    const bufferEntries = Object.entries(buffers);
    const firstReadyEntry = bufferEntries.find(([, status]) => !!status.buffer);
    const [firstReadyKey, firstReadyStatus] = firstReadyEntry ?? [];
    const firstReadyBuffer = firstReadyStatus?.buffer;
    const hasPendingBuffers = bufferEntries.some(([, status]) => status.loading);

    if (blobularBufferKey) {
      const selectedStatus = buffers[blobularBufferKey];

      if (selectedStatus?.buffer) {
        setBlobularBuffer(selectedStatus.buffer, blobularBufferKey);
        return;
      }

      if (selectedStatus?.loading) {
        return;
      }

      if (firstReadyKey && firstReadyBuffer) {
        setBlobularBuffer(firstReadyBuffer, firstReadyKey);
        updateBufferKeyInUrl(firstReadyKey);
        setPageTitle(getDisplayTitle(firstReadyKey));
        hasInitializedFromS3.current = true;
        return;
      }

      if (!hasPendingBuffers) {
        setBlobularBuffer(null, null);
        updateBufferKeyInUrl(null);
        hasInitializedFromS3.current = true;
        return;
      }
    }

    if (hasInitializedFromS3.current && bufferEntries.length > 0) {
      return;
    }

    const bufferKey = getBufferKeyFromUrl();
    const urlStatus = bufferKey ? buffers[bufferKey] : undefined;

    if (bufferKey && urlStatus?.buffer) {
      setBlobularBuffer(urlStatus.buffer, bufferKey);
      const displayTitle = getDisplayTitle(bufferKey);
      setPageTitle(displayTitle);
      hasInitializedFromS3.current = true;
      return;
    }

    if (!bufferKey && firstReadyKey && firstReadyBuffer) {
      setBlobularBuffer(firstReadyBuffer, firstReadyKey);
      hasInitializedFromS3.current = true;
      return;
    }

    if (bufferKey) {
      if (urlStatus?.loading || hasPendingBuffers) {
        return;
      }

      if (firstReadyKey && firstReadyBuffer) {
        setBlobularBuffer(firstReadyBuffer, firstReadyKey);
        updateBufferKeyInUrl(firstReadyKey);
        setPageTitle(getDisplayTitle(firstReadyKey));
        hasInitializedFromS3.current = true;
        return;
      }

      if (bufferEntries.length === 0) {
        return;
      }
    }
  }, [buffers, blobularBufferKey, setBlobularBuffer]);

  const handleSaveClick = async (blob: Blob) => {
    const key = await uploadRecordedBlob(blob);
    if (key) {
      setRecordings((prev) => prev.filter((rec) => rec.blob !== blob));
    }
  };

  const handleRecordClick = async () => {
    if (isRecording) {
      const wavBlob = await stopRecording();
      setUpdatingRecording(false);
      if (wavBlob) {
        const url = URL.createObjectURL(wavBlob);
        setRecordings((prev) => {
          const rest = updatingRecording ? prev.slice(1) : prev;
          return [{ url, blob: wavBlob }, ...rest];
        });
      }
    } else {
      console.log("Starting recording...");
      await startRecording();
    }
  };

  const handleRecordingSelect = async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    setBlobularBuffer(audioBuffer, null);
    updateBufferKeyInUrl(null);
    setPageTitle("recording preview");
    hasInitializedFromS3.current = true;
  };

  const handleUpdateRecordedBuffer = async () => {
    const blob = await updateWavBlob();

    if (!blob) {
      console.error("Failed to update recorded buffer: No blob returned");
      return;
    }
    const url = URL.createObjectURL(blob);

    setRecordings((prev) => {
      const rest = !updatingRecording ? prev : prev.slice(1);
      return [{ url, blob }, ...rest];
    });

    setUpdatingRecording(true);
    await handleRecordingSelect(blob);
  };

  useRecordingLoop(isRecording, handleUpdateRecordedBuffer, 200);

  const handleSelection = (buffer: AudioBuffer | null, key?: string) => {
    if (buffer && key) {
      setBlobularBuffer(buffer, key);
      updateBufferKeyInUrl(key);
      const displayTitle = getDisplayTitle(key);
      setPageTitle(displayTitle);
      setPondMenuOpen(false);
    }
  };

  return (
    <div className={`audio-pond-menu ${pondMenuOpen ? "open" : ""}`}>
      <button
        className="menu-button"
        aria-label="Menu"
        onClick={togglePondMenu}
      >
        {pondMenuOpen ? <ArrowRightFromLine /> : <ArrowLeftFromLine />}
      </button>
      <ButtonRecord
        handleRecordClick={handleRecordClick}
        isRecording={isRecording}
      />

      {/* Input Gain Control */}
      <div
        style={{
          padding: "8px",
          backgroundColor: "rgba(255, 193, 7, 0.1)",
          borderRadius: "4px",
          margin: "4px 8px",
          fontSize: "0.75rem",
          color: "#333",
        }}
      >
        <label
          style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}
        >
          Input Gain: {inputGain.toFixed(1)}x
        </label>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={inputGain}
          onChange={(e) => setInputGain(parseFloat(e.target.value))}
          style={{
            width: "100%",
            accentColor: "#ffc107",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.65rem",
            color: "#666",
            marginTop: "2px",
          }}
        >
          <span>0.1x</span>
          <span>5.0x</span>
        </div>
      </div>

      <button
        disabled={!isRecording}
        className={`update-button ${isRecording ? "recording" : ""}`}
        aria-label="Update"
        onClick={handleUpdateRecordedBuffer}
      >
        <FileAudio />
      </button>

      <ul className="audio-list">
        <h3 className="audio-list-title">Audio Pond </h3>

        {error && (
          <div
            style={{
              color: "#ff6b6b",
              padding: "8px",
              backgroundColor: "rgba(255, 107, 107, 0.1)",
              borderRadius: "4px",
              margin: "8px",
              fontSize: "0.8rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {error}
            <button
              onClick={clearError}
              style={{
                background: "none",
                border: "none",
                color: "#ff6b6b",
                cursor: "pointer",
                padding: "0",
                marginLeft: "8px",
              }}
            >
              ✕
            </button>
          </div>
        )}
        {isUploading && (
          <div
            style={{
              color: "#007acc",
              padding: "8px",
              backgroundColor: "rgba(0, 122, 204, 0.1)",
              borderRadius: "4px",
              margin: "8px",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid #666",
                borderTop: "2px solid #007acc",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            Uploading...
          </div>
        )}
        {isLoading && (
          <div
            style={{
              color: "#007acc",
              padding: "8px",
              backgroundColor: "rgba(0, 122, 204, 0.1)",
              borderRadius: "4px",
              margin: "8px",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid #666",
                borderTop: "2px solid #007acc",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            Loading audio pond...
          </div>
        )}
        {recordings.map((rec, index) => (
          <RecordedItem
            key={index}
            recording={rec}
            onSave={handleSaveClick}
            onSelect={handleRecordingSelect}
          />
        ))}
        {Object.entries(buffers).map(([key, status]) => (
          <PondItem
            key={key}
            keyName={key}
            status={{
              loading: status.loading,
              error: !!status.error,
              buffer: status.buffer ?? null,
            }}
            isSelected={blobularBufferKey === key}
            onSelect={() => handleSelection(status.buffer ?? null, key)}
            onDelete={() => {
              void deleteAudioItem(key);
            }}
          />
        ))}
        <ButtonUpload />
      </ul>
    </div>
  );
};

export default AudioPondMenu;
