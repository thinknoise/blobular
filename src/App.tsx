// src/App.tsx
import AudioBlobularPlayer from "./components/AudioBlobularPlayer";
import "./App.css";
import AudioPondMenu from "./components/AudioBlobularPlayer/AudioPondMenu";
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
