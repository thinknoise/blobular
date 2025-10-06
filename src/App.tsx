// src/App.tsx
import { useState } from "react";

import packageJson from "../package.json";
import { AudioBufferProvider } from "./shared/context/AudioBufferProvider";
import AudioPondMenu from "./features/audioMenu/components/AudioPondMenu";
import { AudioBlobularPlayer } from "@/features/audioBlobular/components";

import { AudioSourceProvider } from "./features/audioBlobular/engine";
import { MicIcon, PlayIcon } from "lucide-react";
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
              Step into the Audio Pond of Blobs, where sound takes shape.
              Blobular lets you explore audio through blobular forms and sample
              bending controls.
            </p>
            <p>
              Record live into Blobulator, click the <MicIcon /> button to start
              recording source for the Blobulator.
            </p>
            <p>
              Then press the Blobulator
              <PlayIcon /> button to hear the magic happen.
            </p>
            <p>
              Adjust the controls to set the duration, fade, playback rate, and
              number of blobs.
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
              <h1 className="blobular-title-chunk left-side">
                Blobular Synthesis
              </h1>
              <AudioBlobularPlayer />
              {/* <AudioBlobularPlayer /> */}
              <AudioPondMenu />
            </div>
          </AudioSourceProvider>
        </AudioBufferProvider>
      )}
    </div>
  );
}

export default App;
