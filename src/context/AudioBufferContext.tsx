// src/context/AudioBufferContext.ts

import { createContext } from "react";

export type AudioBufferContextType = {
  buffer: AudioBuffer | null;
  setBlobularBuffer: (buffer: AudioBuffer | null) => void;
};

export const AudioBufferContext = createContext<
  AudioBufferContextType | undefined
>(undefined);
