import { useEffect, useRef, useState } from "react";
import { playBlobAtTime } from "./playBlobAtTime";
import type { BlobEvent } from "./types";

export const useBlobularEngine = (
  numBlobs: number = 8,
  durationRange: [number, number],
  playbackRateRange: [number, number],
  fadeRange: [number, number]
) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const isPlayingRef = useRef(false);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);

  const durationRangeRef = useRef<[number, number]>(durationRange);
  const playbackRateRangeRef = useRef<[number, number]>(playbackRateRange);

  const fadeRangeRef = useRef<[number, number]>(fadeRange);

  const [blobEvents, setBlobEvents] = useState<(BlobEvent | null)[]>(() =>
    Array(numBlobs).fill(null)
  );

  const blobRefs = useRef(
    Array.from({ length: numBlobs }, () => ({
      nextBlobTime: 0,
    }))
  );

  // keep refs up-to-date with the latest slider values
  useEffect(() => {
    durationRangeRef.current = durationRange;
  }, [durationRange]);

  useEffect(() => {
    playbackRateRangeRef.current = playbackRateRange;
  }, [playbackRateRange]);

  useEffect(() => {
    fadeRangeRef.current = fadeRange;
  }, [fadeRange]);

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
        const [minDur, maxDur] = durationRangeRef.current;
        const randomDuration = Math.random() * (maxDur - minDur) + minDur;

        const [minRate, maxRate] = playbackRateRangeRef.current;
        const randomPlaybackRate =
          Math.random() * (maxRate - minRate) + minRate;

        const actualPlayTime = randomDuration / randomPlaybackRate;

        // 3) pick a random fade within user’s range
        const [minFade, maxFade] = fadeRangeRef.current;
        const randomFade = Math.random() * (maxFade - minFade) + minFade;

        // 4) ensure fade never exceeds half the play time
        const fadeTime = Math.min(randomFade, actualPlayTime / 2);

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
          compressor, // ✅ pass compressor node
          fadeTime
        );

        blob.nextBlobTime += randomDuration - fadeTime;
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
      const resp = await fetch(url);
      const abuf = await resp.arrayBuffer();
      const decoded = await ctx.decodeAudioData(abuf);
      audioBufferRef.current = decoded;
      setBuffer(decoded); // ← store it in state
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

  return { start, stop, blobEvents, buffer };
};
