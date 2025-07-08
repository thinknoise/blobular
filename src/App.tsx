// src/App.tsx
import AudioBlobularPlayer from "./components/AudioBlobularPlayer";
import { listAudioKeys } from "./components/utils/awsS3Helpers";
import "./App.css";
import { useEffect } from "react";
function App() {
  useEffect(() => {
    listAudioKeys()
      .then((keys) => console.log("S3 keys:", keys))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="app-blobular">
      <h1>Blobular</h1>
      <AudioBlobularPlayer />
    </div>
  );
}

export default App;
