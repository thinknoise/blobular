// src/App.tsx
import packageJson from "../package.json";
import { AudioBlobularPlayer } from "@/features/audioBlobular/components";
import { AudioBufferProvider } from "./shared/context/AudioBufferProvider";
import AudioPondMenu from "./features/audioMenu/components/AudioPondMenu";
import "./App.css";
import { AudioSourceProvider } from "./features/audioBlobular/engine";

function App() {
  return (
    <AudioBufferProvider>
      <AudioSourceProvider>
        <div className="version-text">version: {packageJson.version}</div>
        <div className="app-blobular">
          <AudioBlobularPlayer />
          <AudioPondMenu />
        </div>
      </AudioSourceProvider>
    </AudioBufferProvider>
  );
}

export default App;
