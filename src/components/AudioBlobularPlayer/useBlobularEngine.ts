import { useRef, useState } from "react";
import { playBlobAtTime } from "./playBlobAtTime";
import type { BlobEvent } from "./types";

export const useBlobularEngine = (numBlobs: number = 4) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const [blobEvents, setBlobEvents] = useState<BlobEvent[]>([]);

  const blobRefs = useRef(
    Array.from({ length: numBlobs }, () => ({
      nextBlobTime: 0,
    }))
  );

  const createScheduler = (blobIndex: number) => {
    const scheduler = () => {
      if (
        !audioCtxRef.current ||
        !isPlayingRef.current ||
        !audioBufferRef.current
      )
        return;

      const ctx = audioCtxRef.current;
      const buffer = audioBufferRef.current;
      const scheduleAheadTime = 0.1;
      const blob = blobRefs.current[blobIndex];

      while (blob.nextBlobTime < ctx.currentTime + scheduleAheadTime) {
        const randomDuration = Math.random() * 3 + 0.8;
        const randomPlaybackRate = Math.random() * 0.2 + 0.9;

        const event: BlobEvent = {
          blobIndex,
          scheduledTime: blob.nextBlobTime,
          duration: randomDuration,
          playbackRate: randomPlaybackRate,
          timestamp: Date.now(),
        };

        setBlobEvents((prev) => [event, ...prev.slice(0, 49)]);

        playBlobAtTime(
          ctx,
          buffer,
          blob.nextBlobTime,
          randomDuration,
          randomPlaybackRate
        );

        blob.nextBlobTime += randomDuration - 0.3;
      }

      requestAnimationFrame(scheduler);
    };

    return scheduler;
  };

  const start = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    } else if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }

    if (!audioBufferRef.current) {
      const url = `${import.meta.env.BASE_URL}audio/LongHorn.wav`;
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      audioBufferRef.current =
        await audioCtxRef.current.decodeAudioData(arrayBuffer);
    }

    isPlayingRef.current = true;

    blobRefs.current.forEach((blob, index) => {
      blob.nextBlobTime = audioCtxRef.current!.currentTime;
      const scheduler = createScheduler(index);
      scheduler();
    });
  };

  const stop = () => {
    isPlayingRef.current = false;
  };

  return { start, stop, blobEvents };
};
