import React, { useEffect, useState } from "react";
import { listAudioKeys } from "../utils/awsS3Helpers";
import "./AudioPondMenu.css";

const AudioPondMenu: React.FC = () => {
  const [audioFiles, setAudioFiles] = useState<string[]>([]);

  useEffect(() => {
    listAudioKeys()
      .then((keys) => {
        console.log("S3 keys:", keys);
        setAudioFiles(keys);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="audio-pond-menu">
      <h2>Audio Pond</h2>
      {audioFiles.length > 0 && (
        <ul className="audio-list">
          {audioFiles.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AudioPondMenu;
