// src/hooks/useAudioPond.ts
import { useState } from "react";
import {
  listAudioKeys,
  getAudioArrayBuffer,
} from "@/shared/utils/aws/awsS3Helpers";
import { getAudioCtx } from "@/shared/utils/audio/audioCtx";

type BufferStatus = {
  loading: boolean;
  buffer?: AudioBuffer;
  error?: string;
};

export function useAudioPond() {
  const [buffers, setBuffers] = useState<Record<string, BufferStatus>>({});

  /**
   * Fetch all S3 audio keys and decode them as AudioBuffers
   * This is the main initialization function for the audio pond
   */
  const fetchAudioKeysAndBuffers = async () => {
    try {
      // Step 1: Get list of all audio file keys from S3
      const keys = await listAudioKeys();

      // Step 2: Initialize loading state for all keys
      const initialMap: Record<string, BufferStatus> = {};
      keys.forEach((key) => {
        initialMap[key] = { loading: true };
      });
      setBuffers(initialMap);

      // Step 3: Decode each audio file in parallel
      for (const key of keys) {
        try {
          const arrayBuffer = await getAudioArrayBuffer(key);
          const cloned = arrayBuffer.slice(0);
          const audioCtx = getAudioCtx();
          const decoded = await audioCtx.decodeAudioData(cloned);

          setBuffers((prev) => ({
            ...prev,
            [key]: { buffer: decoded, loading: false },
          }));
        } catch (err) {
          console.error(`Failed to load audio file: ${key}`, err);
          setBuffers((prev) => ({
            ...prev,
            [key]: { loading: false, error: String(err) },
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch S3 audio keys:", err);
      throw err;
    }
  };

  return { buffers, fetchAudioKeysAndBuffers };
}
