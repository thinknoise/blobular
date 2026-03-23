// src/context/AudioBufferContext.ts

import { createContext } from "react";

export type AudioBufferContextType = {
  blobularBuffer: AudioBuffer | null;
  blobularSoundId: string | null;
  setBlobularBuffer: (
    buffer: AudioBuffer | null,
    soundId?: string | null
  ) => void;
};

export const AudioBufferContext = createContext<
  AudioBufferContextType | undefined
>(undefined);
