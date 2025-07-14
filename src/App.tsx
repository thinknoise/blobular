// src/App.tsx
import packageJson from "../package.json";
import { AudioBlobularPlayer } from "@/features/audioBlobular/components";
import { AudioBufferProvider } from "./shared/context/AudioBufferProvider";
import AudioPondMenu from "./features/audioMenu/components/AudioPondMenu";
import "./App.css";

function App() {
  return (
    <AudioBufferProvider>
      <div className="version-text">v{packageJson.version}</div>
      <div className="app-blobular">
        <AudioBlobularPlayer />
        <AudioPondMenu />
      </div>
    </AudioBufferProvider>
  );
}

export default App;
