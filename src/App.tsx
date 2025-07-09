// src/App.tsx
import AudioBlobularPlayer from "./components/AudioBlobularPlayer";
import AudioPondMenu from "./components/AudioBlobularPlayer/AudioPondMenu";
import { AudioBufferProvider } from "./context/AudioBufferProvider";
import "./App.css";

function App() {
  return (
    <AudioBufferProvider>
      <div className="app-blobular">
        <h1>Blobular</h1>
        <AudioBlobularPlayer />
        <AudioPondMenu />
      </div>
    </AudioBufferProvider>
  );
}

export default App;
