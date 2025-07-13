// src/context/AudioBufferProvider.tsx

import React, { useState } from "react";
import { AudioBufferContext } from "./AudioBufferContext";

export const AudioBufferProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [blobularBuffer, setBlobularBuffer] = useState<AudioBuffer | null>(
    null
  );

  return (
    <AudioBufferContext.Provider value={{ blobularBuffer, setBlobularBuffer }}>
      {children}
    </AudioBufferContext.Provider>
  );
};
