// features/audioBlobular/engine/AudioSourceProvider.tsx
import React, { useRef } from "react";
import { AudioSourceContext } from "./AudioSourceContext";
import { BlobularAudioSource } from "./BlobularAudioSource";
import { getAudioCtx } from "@/shared";

export const AudioSourceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const sourceRef = useRef<BlobularAudioSource | null>(null);

  if (!sourceRef.current) {
    const audioCtx = getAudioCtx();
    sourceRef.current = new BlobularAudioSource(audioCtx);
  }

  return (
    <AudioSourceContext.Provider value={sourceRef.current}>
      {children}
    </AudioSourceContext.Provider>
  );
};
