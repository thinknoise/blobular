import packageJson from "../../../../package.json";

import { AudioBufferProvider } from "@/shared/context/AudioBufferProvider";
import { AudioBlobularPlayer } from "@/features/audioBlobular/components";
import { AudioPondProvider } from "@/features/audioMenu/context/AudioPondProvider";
import AudioPondMenu from "@/features/audioMenu/components/AudioPondMenu";
import { AudioSourceProvider } from "@/features/audioBlobular/engine";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function BlobularWorkspace() {
  const { user, signOut } = useAuth();

  return (
    <AudioBufferProvider>
      <AudioPondProvider>
        <AudioSourceProvider>
          <div className="workspace-shell">
            <header className="workspace-header">
              <div className="workspace-meta">
                <p className="version-text">version: {packageJson.version}</p>
                <h1 className="blobular-title-chunk left-side">
                  Blobular Synthesis
                </h1>
              </div>
              <div className="workspace-user">
                <div className="user-pill">
                  <span className="user-pill-label">signed in as</span>
                  <span className="user-pill-email">{user?.email}</span>
                </div>
                <button className="signout-button" onClick={signOut}>
                  Sign Out
                </button>
              </div>
            </header>

            <div className="app-blobular">
              <AudioBlobularPlayer />
              <AudioPondMenu />
            </div>
          </div>
        </AudioSourceProvider>
      </AudioPondProvider>
    </AudioBufferProvider>
  );
}
