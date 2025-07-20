// features/audioBlobular/engine/AudioSourceProvider.tsx
import React, { useRef } from "react";
import { AudioSourceContext } from "./AudioSourceContext";
import { BlobularAudioSource } from "./BlobularAudioSource";

export const AudioSourceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const sourceRef = useRef<BlobularAudioSource | null>(null);

  if (!sourceRef.current) {
    const audioCtx = new AudioContext();
    sourceRef.current = new BlobularAudioSource(audioCtx);
  }

  return (
    <AudioSourceContext.Provider value={sourceRef.current}>
      {children}
    </AudioSourceContext.Provider>
  );
};
