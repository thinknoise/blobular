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

  const fetchAudioKeysAndBuffers = async () => {
    const keys = await listAudioKeys();
    console.log("🗝️ Found audio keys:", keys);

    const initialMap: Record<string, BufferStatus> = {};
    keys.forEach((key) => {
      initialMap[key] = { loading: true };
    });
    setBuffers(initialMap);

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
        console.error(`❌ Failed to load ${key}`, err);
        setBuffers((prev) => ({
          ...prev,
          [key]: { loading: false, error: String(err) },
        }));
      }
    }
  };

  return { buffers, fetchAudioKeysAndBuffers };
}
