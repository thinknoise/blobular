// features/audioBlobular/engine/AudioSourceContext.ts
import { createContext } from "react";
import { BlobularAudioSource } from "./BlobularAudioSource";

export const AudioSourceContext = createContext<BlobularAudioSource | null>(
  null
);
