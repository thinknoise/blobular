// features/audioBlobular/engine/useAudioSource.ts
import { useContext } from "react";
import { AudioSourceContext } from "../engine/AudioSourceContext";

export function useAudioSource() {
  const ctx = useContext(AudioSourceContext);
  if (!ctx)
    throw new Error("useAudioSource must be used inside AudioSourceProvider");
  return ctx;
}
