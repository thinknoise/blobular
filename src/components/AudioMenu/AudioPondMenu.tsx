// src/components/AudioPondMenu.tsx
import React, { useEffect, useState } from "react";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { getAudioCtx } from "../../utils/audioCtx";
import { s3, BUCKET } from "../../utils/awsConfig";
import { deleteAudio, listAudioKeys } from "../../utils/awsS3Helpers";

import { useAudioBuffer } from "../../hooks/useAudioBuffer";
import { useAudioPond } from "../../hooks/useAudioPond";
import { useRecording } from "../../hooks/useRecording";

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

  useEffect(() => {
    listAudioKeys();
    fetchAudioKeysAndBuffers();
  }, []);

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

  const bufferArray = Object.entries(buffers);

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
            onSelect={() => {
              if (status.buffer) {
                console.log(`Setting buffer for key: ${key}`, status.buffer);
                setBlobularBuffer(status.buffer);
                setPondMenuOpen(false);
              }
            }}
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
