// src/context/AudioBufferProvider.tsx

import React, { useState } from "react";
import { AudioBufferContext } from "./AudioBufferContext";

export const AudioBufferProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [blobularBuffer, setBlobularBuffer] = useState<AudioBuffer | null>(
    null
  );
  const [blobularBufferKey, setBlobularBufferKey] = useState<string | null>(
    null
  );

  const wrappedSetBlobularBuffer = (
    buffer: AudioBuffer | null,
    key: string | null = null
  ) => {
    setBlobularBuffer(buffer);
    setBlobularBufferKey(key);
  };

  // No default loading - buffers are loaded through AudioPondMenu S3 integration

  return (
    <AudioBufferContext.Provider
      value={{
        blobularBuffer,
        blobularBufferKey,
        setBlobularBuffer: wrappedSetBlobularBuffer,
      }}
    >
      {children}
    </AudioBufferContext.Provider>
  );
};
