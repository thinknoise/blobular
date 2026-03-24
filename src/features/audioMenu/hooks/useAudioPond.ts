import { useContext } from "react";

import {
  AudioPondContext,
  type AudioPondContextType,
} from "../context/AudioPondContext";

export function useAudioPond(): AudioPondContextType {
  const context = useContext(AudioPondContext);

  if (!context) {
    throw new Error("useAudioPond must be used within an AudioPondProvider");
  }

  return context;
}
