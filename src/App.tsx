// src/App.tsx
import packageJson from "../package.json";
import AudioBlobularPlayer from "./components/AudioBlobularPlayer";
import AudioPondMenu from "./components/AudioBlobularPlayer/AudioPondMenu";
import { AudioBufferProvider } from "./context/AudioBufferProvider";
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
