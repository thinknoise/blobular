// src/context/AudioBufferContext.ts

import { createContext } from "react";

export type AudioBufferContextType = {
  blobularBuffer: AudioBuffer | null;
  blobularBufferKey: string | null;
  setBlobularBuffer: (
    buffer: AudioBuffer | null,
    key?: string | null
  ) => void;
};

export const AudioBufferContext = createContext<
  AudioBufferContextType | undefined
>(undefined);
