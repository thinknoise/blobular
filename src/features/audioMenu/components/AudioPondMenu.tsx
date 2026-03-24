// src/components/AudioPondMenu.tsx
import React, { useEffect, useRef, useState } from "react";

import type { SoundRecord } from "@/features/sounds/types";
import { getSoundDisplayTitle } from "@/features/sounds/utils/soundMetadata";
import { getAudioCtx } from "@/shared/utils/audio/audioCtx";
import { setPageTitle } from "@/shared/utils/url/urlHelpers";

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

function updateSelectedSoundInUrl(sound: SoundRecord | null): void {
  const params = new URLSearchParams(window.location.search);

  if (sound) {
    params.set("sound", sound.id);
    params.delete("buffer");
  } else {
    params.delete("sound");
    params.delete("buffer");
  }

  const queryString = params.toString();
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;
  window.history.replaceState(null, "", newUrl);
}

const AudioPondMenu: React.FC = () => {
  const { blobularSoundId, setBlobularBuffer } = useAudioBuffer();

  const {
    sounds,
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

  function getSoundIdFromUrl(soundList: SoundRecord[]): string | null {
    const params = new URLSearchParams(window.location.search);
    const soundId = params.get("sound");
    if (soundId) {
      return soundId;
    }

    const legacyStorageKey = params.get("buffer");
    if (!legacyStorageKey) {
      return null;
    }

    return soundList.find((sound) => sound.storageKey === legacyStorageKey)?.id ?? null;
  }

  useEffect(() => {
    const firstReadySound = sounds.find((sound) => !!buffers[sound.id]?.buffer);
    const firstReadyBuffer = firstReadySound
      ? buffers[firstReadySound.id]?.buffer
      : undefined;
    const hasPendingBuffers = sounds.some((sound) => buffers[sound.id]?.loading);

    if (blobularSoundId) {
      const selectedSound = sounds.find((sound) => sound.id === blobularSoundId);
      const selectedStatus = selectedSound
        ? buffers[selectedSound.id]
        : undefined;

      if (selectedSound && selectedStatus?.buffer) {
        setBlobularBuffer(selectedStatus.buffer, selectedSound.id);
        return;
      }

      if (selectedStatus?.loading) {
        return;
      }

      if (firstReadySound && firstReadyBuffer) {
        setBlobularBuffer(firstReadyBuffer, firstReadySound.id);
        updateSelectedSoundInUrl(firstReadySound);
        setPageTitle(getSoundDisplayTitle(firstReadySound));
        hasInitializedFromS3.current = true;
        return;
      }

      if (!hasPendingBuffers) {
        setBlobularBuffer(null, null);
        updateSelectedSoundInUrl(null);
        hasInitializedFromS3.current = true;
        return;
      }
    }

    if (hasInitializedFromS3.current && sounds.length > 0) {
      return;
    }

    const soundId = getSoundIdFromUrl(sounds);
    const urlSound = soundId
      ? sounds.find((sound) => sound.id === soundId)
      : undefined;
    const urlStatus = urlSound ? buffers[urlSound.id] : undefined;

    if (urlSound && urlStatus?.buffer) {
      setBlobularBuffer(urlStatus.buffer, urlSound.id);
      setPageTitle(getSoundDisplayTitle(urlSound));
      hasInitializedFromS3.current = true;
      return;
    }

    if (!soundId && firstReadySound && firstReadyBuffer) {
      setBlobularBuffer(firstReadyBuffer, firstReadySound.id);
      updateSelectedSoundInUrl(firstReadySound);
      setPageTitle(getSoundDisplayTitle(firstReadySound));
      hasInitializedFromS3.current = true;
      return;
    }

    if (soundId) {
      if (urlStatus?.loading || hasPendingBuffers) {
        return;
      }

      if (firstReadySound && firstReadyBuffer) {
        setBlobularBuffer(firstReadyBuffer, firstReadySound.id);
        updateSelectedSoundInUrl(firstReadySound);
        setPageTitle(getSoundDisplayTitle(firstReadySound));
        hasInitializedFromS3.current = true;
        return;
      }

      if (sounds.length === 0) {
        return;
      }
    }
  }, [buffers, blobularSoundId, setBlobularBuffer, sounds]);

  const handleSaveClick = async (blob: Blob) => {
    const sound = await uploadRecordedBlob(blob);
    if (sound) {
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
    updateSelectedSoundInUrl(null);
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

  const handleSelection = (sound: SoundRecord, buffer: AudioBuffer | null) => {
    if (buffer) {
      setBlobularBuffer(buffer, sound.id);
      updateSelectedSoundInUrl(sound);
      setPageTitle(getSoundDisplayTitle(sound));
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
        {sounds.map((sound) => (
          <PondItem
            key={sound.id}
            sound={sound}
            status={{
              loading: buffers[sound.id]?.loading ?? false,
              error: !!buffers[sound.id]?.error,
              buffer: buffers[sound.id]?.buffer ?? null,
            }}
            isSelected={blobularSoundId === sound.id}
            onSelect={() => handleSelection(sound, buffers[sound.id]?.buffer ?? null)}
            onDelete={() => {
              void deleteAudioItem(sound);
            }}
          />
        ))}
        <ButtonUpload />
      </ul>
    </div>
  );
};

export default AudioPondMenu;
