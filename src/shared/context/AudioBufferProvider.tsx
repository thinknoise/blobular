// src/context/AudioBufferProvider.tsx

import React, { useState } from "react";
import { AudioBufferContext } from "./AudioBufferContext";

export const AudioBufferProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [blobularBuffer, setBlobularBuffer] = useState<AudioBuffer | null>(
    null
  );
  const [blobularSoundId, setBlobularSoundId] = useState<string | null>(
    null
  );

  const wrappedSetBlobularBuffer = (
    buffer: AudioBuffer | null,
    soundId: string | null = null
  ) => {
    setBlobularBuffer(buffer);
    setBlobularSoundId(soundId);
  };

  // No default loading - buffers are loaded through AudioPondMenu S3 integration

  return (
    <AudioBufferContext.Provider
      value={{
        blobularBuffer,
        blobularSoundId,
        setBlobularBuffer: wrappedSetBlobularBuffer,
      }}
    >
      {children}
    </AudioBufferContext.Provider>
  );
};
