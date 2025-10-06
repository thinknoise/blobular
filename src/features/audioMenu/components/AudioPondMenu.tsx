// src/components/AudioPondMenu.tsx
import React, { useEffect, useRef, useState } from "react";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { getAudioCtx } from "@/shared/utils/audio/audioCtx";
import { s3, BUCKET } from "@/shared/utils/aws/awsConfig";
import { deleteAudio, listAudioKeys } from "@/shared/utils/aws/awsS3Helpers";
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

const AudioPondMenu: React.FC = () => {
  const { blobularBuffer, setBlobularBuffer } = useAudioBuffer();

  const { buffers, fetchAudioKeysAndBuffers } = useAudioPond();
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
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hasInitializedFromS3 = useRef(false);
  const togglePondMenu = () => {
    setPondMenuOpen(!pondMenuOpen);
  };

  function getBufferKeyFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    const bufferKey = params.get("buffer");
    console.log("🔍 Raw buffer key from URL:", bufferKey);
    console.log("🔍 Full URL:", window.location.href);
    console.log("🔍 Search params:", window.location.search);

    // Also log the encoded version to see what we're working with
    const encodedKey = new URL(window.location.href).searchParams.get("buffer");
    console.log("🔍 Encoded buffer key:", encodedKey);

    return bufferKey;
  }

  useEffect(() => {
    const loadAudioPond = async () => {
      if (isLoading) return; // Prevent multiple simultaneous loads
      setIsLoading(true);
      try {
        console.log("🔄 Loading audio pond...");
        console.log("🔄 About to call fetchAudioKeysAndBuffers");
        await fetchAudioKeysAndBuffers();
        console.log("✅ Audio pond loaded successfully");
      } catch (error) {
        console.error("❌ Failed to load audio pond:", error);
        console.log("❌ Full error details:", error);
        setError("Failed to load audio pond. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    console.log("🔄 AudioPondMenu useEffect triggered");
    loadAudioPond();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const bufferArray = Object.entries(buffers);

  // Initialize blobularBuffer from URL param or first available buffer
  // This logic runs once on component mount
  // and also when buffers change
  // to ensure blobularBuffer is set correctly
  // based on URL param or first available buffer
  useEffect(() => {
    console.log("🔍 Buffer initialization effect triggered");
    console.log(`Current blobularBuffer: ${!!blobularBuffer}`);
    console.log(`Available buffers: ${Object.keys(buffers).length}`);
    console.log(`Buffer array length: ${bufferArray.length}`);
    console.log(`Has initialized from S3: ${hasInitializedFromS3.current}`);

    // Don't re-initialize if we already have
    if (hasInitializedFromS3.current && Object.keys(buffers).length > 0) {
      console.log("⏭️ Already initialized from S3, skipping");
      return;
    }

    // Check URL parameters first
    const bufferKey = getBufferKeyFromUrl();
    const urlBuffer = bufferKey ? buffers[bufferKey]?.buffer : null;
    const firstBuffer = bufferArray[0]?.[1]?.buffer;

    console.log(`🔍 URL buffer key: "${bufferKey || "none"}"`);
    console.log(`🔍 Available S3 keys:`, Object.keys(buffers));
    console.log(`🔍 URL buffer found: ${!!urlBuffer}`);
    console.log(`🔍 First buffer found: ${!!firstBuffer}`);

    // Priority 1: URL buffer parameter
    if (bufferKey && urlBuffer) {
      console.log(`🎯 Setting blobularBuffer from URL param: ${bufferKey}`);
      setBlobularBuffer(urlBuffer);
      const displayTitle = getDisplayTitle(bufferKey);
      setPageTitle(displayTitle);
      hasInitializedFromS3.current = true;
      return;
    }

    // Priority 2: First S3 buffer if no URL param
    if (firstBuffer && !bufferKey) {
      console.log("🎵 Setting blobularBuffer from first S3 buffer");
      setBlobularBuffer(firstBuffer);
      hasInitializedFromS3.current = true;
      return;
    }

    // Handle URL param cases
    if (bufferKey) {
      const bufferStatus = buffers[bufferKey];
      if (bufferStatus?.loading) {
        console.log(`⏳ Waiting for URL buffer to load: ${bufferKey}`);
        return;
      } else if (bufferStatus?.error) {
        console.log(`❌ URL buffer failed: ${bufferKey}, falling back to first available`);
        if (firstBuffer) {
          setBlobularBuffer(firstBuffer);
          hasInitializedFromS3.current = true;
        }
        return;
      } else if (Object.keys(buffers).length === 0) {
        console.log(`⏳ S3 buffers not loaded yet, waiting...`);
        return;
      } else {
        console.log(`❌ URL buffer not found: ${bufferKey}, falling back to first available`);
        if (firstBuffer) {
          setBlobularBuffer(firstBuffer);
          hasInitializedFromS3.current = true;
        }
        return;
      }
    }

    console.log("⚠️ No S3 buffer available to set");
  }, [buffers, bufferArray, setBlobularBuffer, blobularBuffer]);

  const uploadRecording = async (blob: Blob) => {
    const key = `audio-pond/recording-${Date.now()}.wav`;
    setIsUploading(true);
    setError(null); // Clear any previous errors
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: new Uint8Array(arrayBuffer),
        ContentType: blob.type || "audio/wav",
      });

      await s3.send(command);
      console.log(" Uploaded recording to S3:", key);
      // alert("Upload complete!");
      listAudioKeys(); // Refresh the audio pond list after upload
      fetchAudioKeysAndBuffers(); // Refresh the audio pond list after upload
      setRecordings((prev) => prev.filter((rec) => rec.blob !== blob)); // Remove the recording from the list
      return key;
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setError("Upload failed. Please try again.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveClick = async (blob: Blob) => {
    const key = await uploadRecording(blob);
    if (key) {
      console.log("Recording saved:", key);
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

  const handleUpdateRecordedBuffer = async () => {
    const blob = await updateWavBlob(); // uses all chunks so far

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
    handleRecordingSelect(blob);
  };

  useRecordingLoop(isRecording, handleUpdateRecordedBuffer, 200); // 200ms interval

  const handleRecordingSelect = async (blob: Blob) => {
    console.log("Selected recording:", blob);
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    setBlobularBuffer(audioBuffer);
  };

  //////////////////////
  // click on a pond item
  const handleSelection = (buffer: AudioBuffer | null, key?: string) => {
    if (buffer) {
      setBlobularBuffer(buffer);

      if (key) {
        const params = new URLSearchParams(window.location.search);
        params.set("buffer", key);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", newUrl);
        const displayTitle = getDisplayTitle(key);
        setPageTitle(displayTitle);
      }
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
        
        <div style={{backgroundColor: 'red', color: 'white', padding: '10px', margin: '5px'}}>
          DEBUG: S3 Status - Keys: {Object.keys(buffers).length}, Loading: {isLoading ? 'YES' : 'NO'}, Error: {error || 'NONE'}
        </div>

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
              onClick={() => setError(null)}
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
        {/* uploaded recordings and audio items */}
        {bufferArray.map(([key, status]) => (
          <PondItem
            key={key}
            keyName={key}
            status={{
              loading: status.loading,
              error: !!status.error,
              buffer: status.buffer ?? null,
            }}
            isSelected={blobularBuffer === status.buffer}
            onSelect={() => handleSelection(status.buffer ?? null, key)}
            onDelete={() => {
              // Implement delete functionality if needed
              console.log(`Delete audio item with key: ${key}`);
              deleteAudio(key);
              listAudioKeys(); // Refresh the audio pond list after deletion
              fetchAudioKeysAndBuffers(); // Refresh the audio pond list after deletion
            }}
          />
        ))}
        <ButtonUpload />
      </ul>
    </div>
  );
};

export default AudioPondMenu;
