import { createContext } from "react";

export type BufferStatus = {
  loading: boolean;
  buffer?: AudioBuffer;
  error?: string;
};

export type AudioPondContextType = {
  buffers: Record<string, BufferStatus>;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  clearError: () => void;
  refreshAudioPond: () => Promise<void>;
  uploadRecordedBlob: (blob: Blob) => Promise<string | null>;
  uploadAudioFile: (file: File) => Promise<string | null>;
  deleteAudioItem: (key: string) => Promise<void>;
};

export const AudioPondContext = createContext<
  AudioPondContextType | undefined
>(undefined);
