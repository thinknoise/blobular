// src/context/AudioBufferProvider.tsx

import React, { useState } from "react";
import { AudioBufferContext } from "./AudioBufferContext";

export const AudioBufferProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [blobularBuffer, setBlobularBuffer] = useState<AudioBuffer | null>(
    null
  );

  const wrappedSetBlobularBuffer = (buffer: AudioBuffer | null) => {
    setBlobularBuffer(buffer);
  };

  // No default loading - buffers are loaded through AudioPondMenu S3 integration

  return (
    <AudioBufferContext.Provider
      value={{ blobularBuffer, setBlobularBuffer: wrappedSetBlobularBuffer }}
    >
      {children}
    </AudioBufferContext.Provider>
  );
};
