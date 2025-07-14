import { useEffect, useRef, useState } from "react";
import { playBlobAtTime } from "@/shared/utils/audio/playBlobAtTime";
import { getAudioCtx } from "@/shared/utils/audio/audioCtx";
import type { BlobEvent } from "@/shared/types/types";
import { ALL_SCALES, type ScaleName } from "@/shared/constants/scales";
import { useAudioBuffer } from "@/hooks/useAudioBuffer";
import { controlLimits } from "@/shared/constants/controlLimits";
// ← helper for random major-scale note between minRate…maxRate
const MAJOR_DEGREES = new Set([0, 2, 4, 5, 7, 9, 11]);
function getRandomScalePlaybackRate(
  minRate: number,
  maxRate: number,
  degrees: ReadonlySet<number> = MAJOR_DEGREES
): number {
  // convert rates to semitone bounds
  const minSemi = Math.ceil(12 * Math.log2(minRate));
  const maxSemi = Math.floor(12 * Math.log2(maxRate));

  // collect all semitones in range that lie on a major-scale degree
  const candidates: number[] = [];
  for (let n = minSemi; n <= maxSemi; n++) {
    const mod12 = ((n % 12) + 12) % 12;
    if (degrees.has(mod12)) candidates.push(n);
  }

  // pick one at random (fallback to 0 semis if nothing matches)
  const semi = candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : 0;

  // convert back to rate
  return 2 ** (semi / 12);
}

export const useBlobularEngine = (
  numBlobs: number = controlLimits.DEFAULT_BLOBS,
  durationRange: [number, number] = controlLimits.DEFAULT_DURATION_RANGE,
  playbackRateRange: [
    number,
    number,
  ] = controlLimits.DEFAULT_PLAYBACK_RATE_RANGE,
  fadeRange: [number, number] = controlLimits.DEFAULT_FADE_RANGE,
  selectedScale: ScaleName = "Fifths" // default scale
) => {
  const { blobularBuffer } = useAudioBuffer();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const isPlayingRef = useRef(false);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);

  const blobRefs = useRef(
    Array.from({ length: numBlobs }, () => ({
      nextBlobTime: 0,
    }))
  );

  const durationRangeRef = useRef<[number, number]>(durationRange);
  const playbackRateRangeRef = useRef<[number, number]>(playbackRateRange);
  const fadeRangeRef = useRef<[number, number]>(fadeRange);
  const scaleRef = useRef<ScaleName>(selectedScale);

  const [blobEvents, setBlobEvents] = useState<(BlobEvent | null)[]>(() =>
    Array(numBlobs).fill(null)
  );

  useEffect(() => {
    // Resize blobRefs without resetting all
    const currentRefs = blobRefs.current;
    const newRefs = [...currentRefs];

    if (numBlobs > currentRefs.length) {
      const extra = Array.from(
        { length: numBlobs - currentRefs.length },
        () => ({
          nextBlobTime: 0,
        })
      );
      newRefs.push(...extra);
    } else if (numBlobs < currentRefs.length) {
      newRefs.length = numBlobs; // truncate
    }

    blobRefs.current = newRefs;

    // Resize blobEvents safely
    setBlobEvents((prev) => {
      const newEvents = [...prev];
      if (numBlobs > prev.length) {
        newEvents.push(...Array(numBlobs - prev.length).fill(null));
      } else if (numBlobs < prev.length) {
        newEvents.length = numBlobs;
      }
      return newEvents;
    });

    // Restart only new schedulers if playing
    if (isPlayingRef.current && audioCtxRef.current) {
      for (let i = currentRefs.length; i < numBlobs; i++) {
        blobRefs.current[i].nextBlobTime = audioCtxRef.current.currentTime;
        const scheduler = createScheduler(i);
        scheduler();
      }
    }
  }, [numBlobs]);

  useEffect(() => {
    durationRangeRef.current = durationRange;
  }, [durationRange]);

  useEffect(() => {
    playbackRateRangeRef.current = playbackRateRange;
  }, [playbackRateRange]);

  useEffect(() => {
    fadeRangeRef.current = fadeRange;
  }, [fadeRange]);

  useEffect(() => {
    scaleRef.current = selectedScale;
  }, [selectedScale]);

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

      while (
        blob?.nextBlobTime &&
        blob.nextBlobTime < ctx.currentTime + scheduleAheadTime
      ) {
        // Randomize duration and playback rate
        const [minDur, maxDur] = durationRangeRef.current;
        const randomDuration = Math.random() * (maxDur - minDur) + minDur;

        const [minRate, maxRate] = playbackRateRangeRef.current;
        const degrees = ALL_SCALES.find(
          (s) => s.name === (scaleRef.current as ScaleName)
        )?.degrees;

        const randomPlaybackRate = getRandomScalePlaybackRate(
          minRate,
          maxRate,
          degrees
        );

        const actualPlayTime = randomDuration / randomPlaybackRate;

        // 3) pick a random fade within user’s range
        const [minFade, maxFade] = fadeRangeRef.current;
        const randomFade = Math.random() * (maxFade - minFade) + minFade;

        // 4) ensure fade never exceeds half the play time
        const fadeTime = Math.min(randomFade, actualPlayTime / 2);

        // 5) pan placement
        const coinFlip = Math.random() < 0.5;
        const pan = {
          start: coinFlip ? -1 : 1, // start at left or right
          rampTo: coinFlip ? 1 : -1, // flip the pan direction
        };

        const maxOffset = Math.max(0, buffer.duration - actualPlayTime);
        const randomOffset = Math.random() * maxOffset;

        const gain = 0.8; // or scale down if needed

        const event: BlobEvent = {
          blobIndex,
          scheduledTime: blob.nextBlobTime,
          duration: randomDuration,
          playbackRate: randomPlaybackRate,
          fadeTime,
          pan,
          timestamp: Date.now(),
          offset: randomOffset,
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
          compressor, // pass compressor node
          fadeTime,
          pan,
          randomOffset
        );

        blob.nextBlobTime += randomDuration - fadeTime;
      }

      requestAnimationFrame(scheduler);
    };

    return scheduler;
  };

  useEffect(() => {
    // If blobularBuffer changes, update the audioBufferRef and state
    if (blobularBuffer) {
      // If blobularBuffer is available, set it as the audio buffer
      audioBufferRef.current = blobularBuffer;
      setBuffer(blobularBuffer);
    } else {
      // If not, reset the buffer to null
      audioBufferRef.current = null;
      setBuffer(null);
    }
  }, [blobularBuffer]);

  const start = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = getAudioCtx();
    }

    const ctx = audioCtxRef.current;

    // Initialize compressor if not already created
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

    // Use blobularBuffer if available
    if (blobularBuffer) {
      audioBufferRef.current = blobularBuffer;
      setBuffer(blobularBuffer);
    } else if (!audioBufferRef.current) {
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
