// src/context/AudioBufferProvider.tsx

import React, { useEffect, useState } from "react";
import { AudioBufferContext } from "./AudioBufferContext";
import { DEFAULT_AUDIO_URL } from "../constants/urls";
import { getAudioCtx } from "../utils/audio/audioCtx";

export const AudioBufferProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [blobularBuffer, setBlobularBuffer] = useState<AudioBuffer | null>(
    null
  );

  const wrappedSetBlobularBuffer = (buffer: AudioBuffer | null) => {
    setBlobularBuffer(buffer);
  };

  // Load default audio buffer on mount
  useEffect(() => {
    const loadDefaultBuffer = async () => {
      try {
        const response = await fetch(DEFAULT_AUDIO_URL);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = getAudioCtx();
        const decoded = await audioContext.decodeAudioData(arrayBuffer);
        wrappedSetBlobularBuffer(decoded);
      } catch (error) {
        console.error("Failed to load default audio buffer:", error);
      }
    };

    if (!blobularBuffer) {
      loadDefaultBuffer();
    }
  }, [blobularBuffer]);

  return (
    <AudioBufferContext.Provider
      value={{ blobularBuffer, setBlobularBuffer: wrappedSetBlobularBuffer }}
    >
      {children}
    </AudioBufferContext.Provider>
  );
};
