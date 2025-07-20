import React from "react";

import { MicIcon } from "./IconMic";
import "./Button.css";

interface ButtonRecordProps {
  handleRecordClick: () => void;
  isRecording: boolean;
}

const ButtonRecord: React.FC<ButtonRecordProps> = ({
  handleRecordClick,
  isRecording,
}) => {
  return (
    <div>
      <button
        onClick={handleRecordClick}
        className={`record-button ${isRecording ? "recording" : ""}`}
      >
        <MicIcon size={43} color="#3a80e3" style={{ marginTop: "-8px" }} />
        <div className="recording-button-status">
          {isRecording ? "recording..." : "record"}
        </div>
      </button>
    </div>
  );
};

export default ButtonRecord;
