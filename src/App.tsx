// src/App.tsx
import packageJson from "../package.json";
import AudioBlobularPlayer from "./components/AudioBlobularPlayer";
import { AudioBufferProvider } from "./context/AudioBufferProvider";
import AudioMenu from "./components/AudioMenu/AudioMenu";
import "./App.css";

function App() {
  return (
    <AudioBufferProvider>
      <div className="version-text">v{packageJson.version}</div>
      <div className="app-blobular">
        <AudioBlobularPlayer />
        <AudioMenu />
      </div>
    </AudioBufferProvider>
  );
}

export default App;
