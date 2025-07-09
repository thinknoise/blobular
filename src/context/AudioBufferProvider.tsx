// src/context/AudioBufferProvider.tsx

import React, { useState } from "react";
import { AudioBufferContext } from "./AudioBufferContext";

export const AudioBufferProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [buffer, setBlobularBuffer] = useState<AudioBuffer | null>(null);

  return (
    <AudioBufferContext.Provider value={{ buffer, setBlobularBuffer }}>
      {children}
    </AudioBufferContext.Provider>
  );
};
