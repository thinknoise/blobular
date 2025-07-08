// src/App.tsx
import AudioBlobularPlayer from "./components/AudioBlobularPlayer";
import AudioPondMenu from "./components/AudioBlobularPlayer/AudioPondMenu";
import "./App.css";

function App() {
  return (
    <div className="app-blobular">
      <h1>Blobular</h1>
      <AudioBlobularPlayer />
      <AudioPondMenu />
    </div>
  );
}

export default App;
