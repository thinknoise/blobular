import React, { useState } from "react";
import { useRecording } from "../../hooks/useRecording";
import { getAudioCtx } from "../../utils/audioCtx";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../../utils/awsConfig";
import RecordedItem from "./RecordedItem";

import { MicIcon } from "./AudioPond/IconMic";
import "./AudioRecordMenu.css"; // Ensure you have styles for the recording menu

interface AudioRecordMenuProps {
  toggleMenu: () => void;
  isOpen: boolean;
  setPondMenuOpen?: (value: boolean) => void; // Optional prop to control pond menu state
}
const AudioRecordMenu: React.FC<AudioRecordMenuProps> = ({
  toggleMenu,
  isOpen,
  setPondMenuOpen,
}) => {
  const audioContext = getAudioCtx();
  const { isRecording, startRecording, stopRecording } =
    useRecording(audioContext);

  interface Recording {
    url: string;
    blob: Blob;
  }

  const [recordings, setRecordings] = useState<Recording[]>([]);

  const handleRecordClick = async () => {
    if (isRecording) {
      const wavBlob = await stopRecording();
      if (wavBlob) {
        const url = URL.createObjectURL(wavBlob);
        setRecordings((prev) => [{ url, blob: wavBlob }, ...prev]);
      }
    } else {
      await startRecording();
    }
  };

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
      alert("Upload complete!");
      toggleMenu(); // Close the menu after upload
      setRecordings((prev) => prev.filter((rec) => rec.blob !== blob)); // Remove the recording from the list
      if (setPondMenuOpen) {
        setPondMenuOpen(true); // Open the pond menu after upload
      }
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

  return (
    <div className={`audio-record-menu ${isOpen ? "open" : ""}`}>
      <button
        className="menu-button record-menu-button"
        aria-label="Menu"
        onClick={toggleMenu}
      >
        <MicIcon size={21} color={"#ffffff"} />
      </button>
      <button
        onClick={handleRecordClick}
        className={`record-button ${isRecording ? "recording" : ""}`}
      >
        <MicIcon size={32} color={isRecording ? "#ff1744" : "#3a80e3"} />
      </button>
      {recordings.map((rec, index) => (
        <RecordedItem key={index} recording={rec} onSave={handleSaveClick} />
      ))}
    </div>
  );
};

export default AudioRecordMenu;
