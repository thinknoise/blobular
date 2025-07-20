// src/App.tsx
import { useState } from "react";

import packageJson from "../package.json";
import { AudioBufferProvider } from "./shared/context/AudioBufferProvider";
import AudioPondMenu from "./features/audioMenu/components/AudioPondMenu";
import { AudioBlobularPlayer } from "@/features/audioBlobular/components";

import { AudioSourceProvider } from "./features/audioBlobular/engine";
import { MicIcon } from "lucide-react";
import "./App.css";

function App() {
  const [userInteraction, setUserInteraction] = useState(false);

  return (
    <div className="App">
      {!userInteraction && (
        <div className="welcome-screen">
          <div className="header">
            <h1>Blobular</h1>
            <p>
              <em>audio blobular player</em>
            </p>
            <p>version: {packageJson.version}</p>
          </div>

          <div className="description">
            <p>
              Step into the pond, where sound takes shape. Blobular lets you
              explore audio through blobular forms and sample bending controls.
            </p>
            <p>
              Record live into blobularator, click <MicIcon />, then mess with
              playback, and watch it all come alive.
            </p>
            <p>When you’re ready, tap below and let the blobs begin.</p>
          </div>

          <button
            className="create-audio-button"
            onClick={() => setUserInteraction(true)}
          >
            Enter Blobular
          </button>
        </div>
      )}
      {userInteraction && (
        <AudioBufferProvider>
          <AudioSourceProvider>
            <div className="version-text">version: {packageJson.version}</div>
            <div className="app-blobular">
              <AudioBlobularPlayer />
              <AudioPondMenu />
            </div>
          </AudioSourceProvider>
        </AudioBufferProvider>
      )}
    </div>
  );
}

export default App;
