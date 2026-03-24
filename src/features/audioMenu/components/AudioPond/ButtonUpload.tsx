// src/components/ButtonUpload.tsx

import { useRef } from "react";
import { CloudArrowUp } from "phosphor-react";
import IconButton from "@mui/material/IconButton";
import "./Button.css";
import { useAudioPond } from "../../hooks/useAudioPond";

export default function ButtonUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAudioFile, isUploading } = useAudioPond();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadAudioFile(file);
    e.target.value = "";
  };

  return (
    <div className="button-upload-container">
      <IconButton
        onClick={handleClick}
        className="upload-button"
        disabled={isUploading}
      >
        <CloudArrowUp fontSize={32} color="white" />
      </IconButton>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}
