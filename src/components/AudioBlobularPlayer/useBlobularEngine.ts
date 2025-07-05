import { useRef, useState } from "react";
import { playBlobAtTime } from "./playBlobAtTime";
import type { BlobEvent } from "./types";

export const useBlobularEngine = (
  numBlobs: number = 4,
  durationRange: [number, number],
  playbackRateRange: [number, number]
) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const isPlayingRef = useRef(false);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const [blobEvents, setBlobEvents] = useState<(BlobEvent | null)[]>(() =>
    Array(numBlobs).fill(null)
  );

  const blobRefs = useRef(
    Array.from({ length: numBlobs }, () => ({
      nextBlobTime: 0,
    }))
  );

  const createScheduler = (blobIndex: number) => {
    const scheduler = () => {
      if (
        !audioCtxRef.current ||
        !compressorRef.current ||
        !isPlayingRef.current ||
        !audioBufferRef.current
      )
        return;

      const ctx = audioCtxRef.current;
      const buffer = audioBufferRef.current;
      const compressor = compressorRef.current;

      const scheduleAheadTime = 0.1;
      const blob = blobRefs.current[blobIndex];

      while (blob.nextBlobTime < ctx.currentTime + scheduleAheadTime) {
        // Randomize duration and playback rate
        const randomDuration =
          Math.random() * (durationRange[1] - durationRange[0]) +
          durationRange[0];

        const randomPlaybackRate =
          Math.random() * (playbackRateRange[1] - playbackRateRange[0]) +
          playbackRateRange[0];
        const gain = 0.8; // or scale down if needed

        const event: BlobEvent = {
          blobIndex,
          scheduledTime: blob.nextBlobTime,
          duration: randomDuration,
          playbackRate: randomPlaybackRate,
          timestamp: Date.now(),
        };

        setBlobEvents((prev) => {
          const updated = [...prev];
          updated[blobIndex] = event;
          return updated;
        });

        playBlobAtTime(
          ctx,
          buffer,
          blob.nextBlobTime,
          randomDuration,
          randomPlaybackRate,
          gain,
          compressor // ✅ pass compressor node
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

    const ctx = audioCtxRef.current;

    // ✅ Initialize compressor if not already created
    if (!compressorRef.current && ctx) {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      compressor.connect(ctx.destination);
      compressorRef.current = compressor;
    }

    if (!audioBufferRef.current) {
      const url = `${import.meta.env.BASE_URL}audio/LongHorn.wav`;
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      audioBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
    }

    isPlayingRef.current = true;

    blobRefs.current.forEach((blob, index) => {
      blob.nextBlobTime = ctx.currentTime;
      const scheduler = createScheduler(index);
      scheduler();
    });
  };

  const stop = () => {
    isPlayingRef.current = false;
  };

  return { start, stop, blobEvents };
};
