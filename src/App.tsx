// src/App.tsx
import AudioBlobularPlayer from "./components/AudioBlobularPlayer";
import AudioPondMenu from "./components/AudioBlobularPlayer/AudioPondMenu";
import { BlobPanelAudioProvider } from "./hooks/useBlobPanelAudio";
import "./App.css";

function App() {
  return (
    <div className="app-blobular">
      <BlobPanelAudioProvider>
        <h1>Blobular</h1>
        <AudioBlobularPlayer />
        <AudioPondMenu />
      </BlobPanelAudioProvider>
    </div>
  );
}

export default App;
