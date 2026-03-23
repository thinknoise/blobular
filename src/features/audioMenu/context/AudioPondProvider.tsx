import React, { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { soundLibraryClient } from "@/features/sounds/api/soundLibraryClient";
import type { SoundRecord } from "@/features/sounds/types";
import { getAudioCtx } from "@/shared/utils/audio/audioCtx";

import {
  AudioPondContext,
  type BufferStatus,
} from "./AudioPondContext";

export const AudioPondProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [sounds, setSounds] = useState<SoundRecord[]>([]);
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
      const nextSounds = await soundLibraryClient.listSounds({ user });
      const initialState: Record<string, BufferStatus> = {};

      for (const sound of nextSounds) {
        initialState[sound.id] = { loading: true };
      }

      setSounds(nextSounds);
      setBuffers(initialState);

      for (const sound of nextSounds) {
        try {
          const arrayBuffer = await soundLibraryClient.getSoundArrayBuffer(sound);
          const decoded = await getAudioCtx().decodeAudioData(
            arrayBuffer.slice(0)
          );

          setBuffers((prev) => ({
            ...prev,
            [sound.id]: { loading: false, buffer: decoded },
          }));
        } catch (decodeError) {
          console.error(
            `Failed to load audio file: ${sound.storageKey}`,
            decodeError
          );
          setBuffers((prev) => ({
            ...prev,
            [sound.id]: { loading: false, error: String(decodeError) },
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
  }, [user]);

  useEffect(() => {
    void refreshAudioPond();
  }, [refreshAudioPond]);

  const uploadRecordedBlob = useCallback(
    async (blob: Blob) => {
      setIsUploading(true);
      setError(null);

      try {
        const sound = await soundLibraryClient.uploadSound({
          blob,
          filename: "recording.wav",
          kind: "recording",
          owner: user,
        });
        await refreshAudioPond();
        return sound;
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
    [refreshAudioPond, user]
  );

  const uploadAudioFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);

      try {
        const sound = await soundLibraryClient.uploadSound({
          blob: file,
          filename: file.name,
          kind: "upload",
          owner: user,
        });
        await refreshAudioPond();
        return sound;
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
    [refreshAudioPond, user]
  );

  const deleteAudioItem = useCallback(
    async (sound: SoundRecord) => {
      setError(null);

      try {
        await soundLibraryClient.deleteSound(sound, user);
        await refreshAudioPond();
      } catch (deleteError) {
        console.error(
          `Failed to delete audio file: ${sound.storageKey}`,
          deleteError
        );
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : String(deleteError);
        setError(`Delete failed: ${message}`);
      }
    },
    [refreshAudioPond, user]
  );

  return (
    <AudioPondContext.Provider
      value={{
        sounds,
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
