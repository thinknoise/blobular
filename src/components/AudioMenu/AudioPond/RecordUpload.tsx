import React, { useState } from "react";
import { useRecording } from "../../../hooks/useRecording";
import { getAudioCtx } from "../../../utils/audioCtx";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../../../utils/awsConfig";
import RecordedItem from "./RecordedItem";

import { useAudioPond } from "../../../hooks/useAudioPond";
import { listAudioKeys } from "../../../utils/awsS3Helpers";
import ButtonUpload from "./ButtonUpload";

import { MicIcon } from "./IconMic";
import "./RecordUpload.css";

const AudioRecordMenu: React.FC = () => {
  const audioContext = getAudioCtx();
  const { isRecording, startRecording, stopRecording } =
    useRecording(audioContext);

  const { fetchAudioKeysAndBuffers } = useAudioPond();

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
      // alert("Upload complete!");
      listAudioKeys(); // Refresh the audio pond list after upload
      fetchAudioKeysAndBuffers(); // Refresh the audio pond list after upload
      // setRecordings((prev) => prev.filter((rec) => rec.blob !== blob)); // Remove the recording from the list
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
  const handleUploadComplete = (key: string) => {
    console.log("Uploaded file key:", key);
    // Update your registry or UI state here
    listAudioKeys(); // Refresh the audio pond list after upload

    fetchAudioKeysAndBuffers(); // Refresh the list after upload
  };

  return (
    <div>
      <ButtonUpload onUpload={handleUploadComplete} />
      <button
        onClick={handleRecordClick}
        className={`record-button ${isRecording ? "recording" : ""}`}
      >
        <MicIcon size={32} color={isRecording ? "#ff1744" : "#3a80e3"} />
        <div className="recording-status">
          {isRecording ? "recording..." : "record"}
        </div>
      </button>
      {recordings.map((rec, index) => (
        <RecordedItem key={index} recording={rec} onSave={handleSaveClick} />
      ))}
    </div>
  );
};

export default AudioRecordMenu;
