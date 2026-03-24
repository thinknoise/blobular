import packageJson from "../package.json";
import AuthGate from "./features/auth/components/AuthGate";
import { useAuth } from "./features/auth/hooks/useAuth";
import BlobularWorkspace from "./features/appShell/components/BlobularWorkspace";
import "./App.css";

function App() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <div className="auth-screen">
        <div className="auth-card auth-loading">
          <p className="eyebrow">Blobular</p>
          <h1>Loading workspace...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        <BlobularWorkspace />
      ) : (
        <AuthGate version={packageJson.version} />
      )}
    </div>
  );
}

export default App;
