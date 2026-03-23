import React, { useCallback, useEffect, useRef, useState } from "react";

import { getAudioCtx } from "@/shared/utils/audio/audioCtx";
import {
  deleteAudio,
  getAudioArrayBuffer,
  listAudioKeys,
  uploadAudio,
} from "@/shared/utils/aws/awsS3Helpers";

import {
  AudioPondContext,
  type BufferStatus,
} from "./AudioPondContext";

function getUploadKey(filename: string): string {
  return `audio-pond/${Date.now()}-${filename}`;
}

function getRecordingKey(): string {
  return `audio-pond/recording-${Date.now()}.wav`;
}

export const AudioPondProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [buffers, setBuffers] = useState<Record<string, BufferStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);

  const refreshAudioPond = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const keys = await listAudioKeys();
      const initialState: Record<string, BufferStatus> = {};

      for (const key of keys) {
        initialState[key] = { loading: true };
      }

      setBuffers(initialState);

      for (const key of keys) {
        try {
          const arrayBuffer = await getAudioArrayBuffer(key);
          const decoded = await getAudioCtx().decodeAudioData(
            arrayBuffer.slice(0)
          );

          setBuffers((prev) => ({
            ...prev,
            [key]: { loading: false, buffer: decoded },
          }));
        } catch (decodeError) {
          console.error(`Failed to load audio file: ${key}`, decodeError);
          setBuffers((prev) => ({
            ...prev,
            [key]: { loading: false, error: String(decodeError) },
          }));
        }
      }
    } catch (loadError) {
      console.error("Failed to fetch S3 audio keys:", loadError);
      const message =
        loadError instanceof Error ? loadError.message : String(loadError);
      setError(`Failed to load audio pond: ${message}`);
    } finally {
      isRefreshingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAudioPond();
  }, [refreshAudioPond]);

  const uploadRecordedBlob = useCallback(
    async (blob: Blob) => {
      const key = getRecordingKey();
      setIsUploading(true);
      setError(null);

      try {
        await uploadAudio(key, blob);
        await refreshAudioPond();
        return key;
      } catch (uploadError) {
        console.error("Failed to upload recorded audio:", uploadError);
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : String(uploadError);
        setError(`Upload failed: ${message}`);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [refreshAudioPond]
  );

  const uploadAudioFile = useCallback(
    async (file: File) => {
      const key = getUploadKey(file.name);
      setIsUploading(true);
      setError(null);

      try {
        await uploadAudio(key, file);
        await refreshAudioPond();
        return key;
      } catch (uploadError) {
        console.error("Failed to upload audio file:", uploadError);
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : String(uploadError);
        setError(`Upload failed: ${message}`);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [refreshAudioPond]
  );

  const deleteAudioItem = useCallback(
    async (key: string) => {
      setError(null);

      try {
        await deleteAudio(key);
        await refreshAudioPond();
      } catch (deleteError) {
        console.error(`Failed to delete audio file: ${key}`, deleteError);
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : String(deleteError);
        setError(`Delete failed: ${message}`);
      }
    },
    [refreshAudioPond]
  );

  return (
    <AudioPondContext.Provider
      value={{
        buffers,
        isLoading,
        isUploading,
        error,
        clearError: () => setError(null),
        refreshAudioPond,
        uploadRecordedBlob,
        uploadAudioFile,
        deleteAudioItem,
      }}
    >
      {children}
    </AudioPondContext.Provider>
  );
};
