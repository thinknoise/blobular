import { createContext } from "react";

import type { SoundRecord } from "@/features/sounds/types";

export type BufferStatus = {
  loading: boolean;
  buffer?: AudioBuffer;
  error?: string;
};

export type AudioPondContextType = {
  sounds: SoundRecord[];
  buffers: Record<string, BufferStatus>;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  clearError: () => void;
  refreshAudioPond: () => Promise<void>;
  uploadRecordedBlob: (blob: Blob) => Promise<SoundRecord | null>;
  uploadAudioFile: (file: File) => Promise<SoundRecord | null>;
  deleteAudioItem: (sound: SoundRecord) => Promise<void>;
};

export const AudioPondContext = createContext<
  AudioPondContextType | undefined
>(undefined);
