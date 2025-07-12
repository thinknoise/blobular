// src/App.tsx
import packageJson from "../package.json";
import AudioBlobularPlayer from "./components/AudioBlobularPlayer";
import { AudioBufferProvider } from "./context/AudioBufferProvider";
import AudioPondMenu from "./components/AudioMenu/AudioPondMenu";
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
