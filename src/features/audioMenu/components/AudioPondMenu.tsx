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

import CreateAudio from "./AudioPond/CreateAudio";
import RecordedItem from "./AudioPond/RecordedItem";
import PondItem from "./AudioPond/PondItem";

import { ArrowLeftFromLine, ArrowRightFromLine, FileAudio } from "lucide-react";
import "./AudioPondMenu.css";
import "./AudioPond/Button.css";

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
  const { isRecording, startRecording, stopRecording, updateWavBlob } =
    useRecording(audioContext);
  const [recordings, setRecordings] = useState<{ url: string; blob: Blob }[]>(
    []
  );
  const [updatingRecording, setUpdatingRecording] = useState(false);
  const togglePondMenu = () => {
    setPondMenuOpen(!pondMenuOpen);
  };

  function getBufferKeyFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    const bufferKey = params.get("buffer");
    console.log("Buffer key from URL:", bufferKey);
    return bufferKey;
  }

  useEffect(() => {
    fetchAudioKeysAndBuffers();
  }, []);

  const bufferArray = Object.entries(buffers);

  // Initialize blobularBuffer from URL param or first available buffer
  // This logic runs once on component mount
  // and also when buffers change
  // to ensure blobularBuffer is set correctly
  // based on URL param or first available buffer
  useEffect(() => {
    if (blobularBuffer) return; //  don't override if already set

    const bufferKey = getBufferKeyFromUrl();
    const urlBuffer = bufferKey ? buffers[bufferKey]?.buffer : null;
    const firstBuffer = bufferArray[0]?.[1]?.buffer;

    if (bufferKey && urlBuffer) {
      console.log("Setting blobularBuffer from URL param:", bufferKey);
      setBlobularBuffer(urlBuffer);
      const displayTitle = getDisplayTitle(bufferKey);
      setPageTitle(displayTitle);
      return;
    } else if (firstBuffer && !bufferKey) {
      console.log("Initial blobularBuffer:", firstBuffer);
      setBlobularBuffer(firstBuffer);
    }
  }, [buffers, bufferArray, blobularBuffer, setBlobularBuffer]);

  const uploadRecording = async (blob: Blob) => {
    const key = `audio-pond/recording-${Date.now()}.wav`;
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
      alert("Upload failed.");
      return null;
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
      <CreateAudio
        handleRecordClick={handleRecordClick}
        isRecording={isRecording}
      />
      <button
        disabled={!isRecording}
        className={`update-button ${isRecording ? "recording" : ""}`}
        aria-label="Update"
        onClick={handleUpdateRecordedBuffer}
      >
        <FileAudio />
      </button>
      <ul className="audio-list">
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
      </ul>
    </div>
  );
};

export default AudioPondMenu;
