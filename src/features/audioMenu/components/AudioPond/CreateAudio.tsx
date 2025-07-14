import React from "react";
import { useAudioPond } from "../../hooks/useAudioPond";
import { listAudioKeys } from "@/shared/utils/aws/awsS3Helpers";
import ButtonUpload from "./ButtonUpload";

import { MicIcon } from "./IconMic";
import "./CreateAudio.css";

interface CreateAudioProps {
  handleRecordClick: () => void;
  isRecording: boolean;
}

const CreateAudio: React.FC<CreateAudioProps> = ({
  handleRecordClick,
  isRecording,
}) => {
  const { fetchAudioKeysAndBuffers } = useAudioPond();

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
        <MicIcon
          size={32}
          color={isRecording ? "#ff1744" : "#3a80e3"}
          style={{ marginTop: "-8px" }}
        />
        <div className="recording-status">
          {isRecording ? "recording..." : "record"}
        </div>
      </button>
    </div>
  );
};

export default CreateAudio;
