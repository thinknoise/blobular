// src/components/ButtonUpload.tsx

import { useRef } from "react";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../../../utils/awsConfig";

type ButtonUploadProps = {
  onUpload?: (key: string) => void;
};

export default function ButtonUpload({ onUpload }: ButtonUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = `audio-pond/${Date.now()}-${file.name}`;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: new Uint8Array(arrayBuffer),
        ContentType: file.type,
      });

      await s3.send(command);
      console.log("✅ Uploaded to S3:", key);
      alert("Upload complete!");

      onUpload?.(key);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed.");
    }
  };

  return (
    <>
      <button className="upload-button" onClick={handleClick}>
        Upload Audio
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </>
  );
}
