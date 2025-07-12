import { useContext } from "react";
import {
  AudioBufferContext,
  type AudioBufferContextType,
} from "../context/AudioBufferContext";

export const useAudioBuffer = (): AudioBufferContextType => {
  const context = useContext(AudioBufferContext);
  if (!context) {
    throw new Error(
      "useAudioBuffer must be used within an AudioBufferProvider"
    );
  }
  return context;
};
