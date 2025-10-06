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
    console.log("🔄 fetchAudioKeysAndBuffers called");
    
    // Basic connectivity test
    console.log("🔄 Testing basic fetch API...");
    try {
      const testResponse = await fetch("https://httpbin.org/get");
      console.log("✅ Basic fetch works:", testResponse.ok);
    } catch (fetchError) {
      console.error("❌ Basic fetch failed:", fetchError);
    }
    
    try {
      const keys = await listAudioKeys();
      console.log("🗝️ Found audio keys:", keys);
      console.log("🗝️ Keys length:", keys.length);

      const initialMap: Record<string, BufferStatus> = {};
      keys.forEach((key) => {
        initialMap[key] = { loading: true };
      });
      setBuffers(initialMap);

      for (const key of keys) {
        try {
          console.log(`🔄 Loading buffer for key: ${key}`);
          const arrayBuffer = await getAudioArrayBuffer(key);
          const cloned = arrayBuffer.slice(0);
          const audioCtx = getAudioCtx();
          const decoded = await audioCtx.decodeAudioData(cloned);

          setBuffers((prev) => ({
            ...prev,
            [key]: { buffer: decoded, loading: false },
          }));
          console.log(`✅ Loaded buffer for key: ${key}`);
        } catch (err) {
          console.error(`❌ Failed to load ${key}`, err);
          setBuffers((prev) => ({
            ...prev,
            [key]: { loading: false, error: String(err) },
          }));
        }
      }
    } catch (err) {
      console.error("❌ Failed to list audio keys:", err);
      console.error("❌ Error details for listAudioKeys:", {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : 'No stack',
      });
      throw err;
    }
  };

  return { buffers, fetchAudioKeysAndBuffers };
}
