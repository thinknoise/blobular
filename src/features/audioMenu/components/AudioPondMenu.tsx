// src/components/AudioPondMenu.tsx
import React, { useEffect, useState } from "react";
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

import "./AudioPondMenu.css";

const AudioPondMenu: React.FC = () => {
  const { blobularBuffer, setBlobularBuffer } = useAudioBuffer();

  const { buffers, fetchAudioKeysAndBuffers } = useAudioPond();
  const [pondMenuOpen, setPondMenuOpen] = useState(false);

  const audioContext = getAudioCtx();
  const { isRecording, startRecording, stopRecording } =
    useRecording(audioContext);
  const [recordings, setRecordings] = useState<{ url: string; blob: Blob }[]>(
    []
  );

  const togglePondMenu = () => {
    setPondMenuOpen(!pondMenuOpen);
  };

  function getBufferKeyFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get("buffer");
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
    const bufferKey = getBufferKeyFromUrl();

    // If URL param is present and valid, use it
    if (bufferKey && buffers[bufferKey]?.buffer) {
      if (blobularBuffer !== buffers[bufferKey].buffer) {
        console.log("Setting blobularBuffer from URL param:", bufferKey);
        setBlobularBuffer(buffers[bufferKey].buffer);
        const displayTitle = getDisplayTitle(bufferKey);
        setPageTitle(displayTitle);
      }
      return;
    }

    // Otherwise, fall back to first available buffer
    if (!blobularBuffer && bufferArray.length > 0) {
      const firstBuffer = bufferArray[0][1].buffer;
      console.log("Setting initial blobularBuffer from pond:", firstBuffer);
      if (firstBuffer) {
        setBlobularBuffer(firstBuffer);
      }
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
      console.log("✅ Uploaded recording to S3:", key);
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

  const handleRecordClick = async () => {
    if (isRecording) {
      const wavBlob = await stopRecording();
      if (wavBlob) {
        const url = URL.createObjectURL(wavBlob);
        setRecordings((prev) => [{ url, blob: wavBlob }, ...prev]);
      }
    } else {
      console.log("Starting recording...");
      await startRecording();
    }
  };

  const handleSaveClick = async (blob: Blob) => {
    const key = await uploadRecording(blob);
    if (key) {
      console.log("Recording saved:", key);
    }
  };

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
        ☰
      </button>
      <CreateAudio
        handleRecordClick={handleRecordClick}
        isRecording={isRecording}
      />
      <ul className="audio-list">
        {recordings.map((rec, index) => (
          <RecordedItem key={index} recording={rec} onSave={handleSaveClick} />
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
