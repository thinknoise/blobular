import { useContext } from "react";
import {
  AudioBufferContext,
  type AudioBufferContextType,
} from "../shared/context/AudioBufferContext";

export const useAudioBuffer = (): AudioBufferContextType => {
  const context = useContext(AudioBufferContext);
  if (!context) {
    throw new Error(
      "useAudioBuffer must be used within an AudioBufferProvider"
    );
  }
  return context;
};
