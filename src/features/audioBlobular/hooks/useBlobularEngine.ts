import { useEffect, useRef, useState, useCallback } from "react";
import { playBlobAtTime } from "@/shared/utils/audio/playBlobAtTime";
import { getAudioCtx } from "@/shared/utils/audio/audioCtx";
import type { BlobEvent } from "@/shared/types/types";
import { ALL_SCALES, type ScaleName } from "@/shared/constants/scales";
import { useAudioBuffer } from "@/hooks/useAudioBuffer";
import { controlLimits } from "@/shared/constants/controlLimits";
import { useAudioSource } from "../engine";

// helper for random major-scale note between minRate…maxRate
const MAJOR_DEGREES = new Set([0, 2, 4, 5, 7, 9, 11]);
function getRandomScalePlaybackRate(
  minRate: number,
  maxRate: number,
  degrees: ReadonlySet<number> = MAJOR_DEGREES
): number {
  const minSemi = Math.ceil(12 * Math.log2(minRate));
  const maxSemi = Math.floor(12 * Math.log2(maxRate));
  const candidates: number[] = [];
  for (let n = minSemi; n <= maxSemi; n++) {
    const mod12 = ((n % 12) + 12) % 12;
    if (degrees.has(mod12)) candidates.push(n);
  }
  const semi = candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : 0;
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
  selectedScale: ScaleName = "Fifths"
) => {
  const { blobularBuffer } = useAudioBuffer();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);

  // NEW: mic + recorder refs
  const micNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micMonitorRef = useRef<GainNode | null>(null);
  const micRecorderRef = useRef<AudioWorkletNode | null>(null);

  const blobRefs = useRef(
    Array.from({ length: numBlobs }, () => ({ nextBlobTime: 0 }))
  );

  const durationRangeRef = useRef<[number, number]>(durationRange);
  const playbackRateRangeRef = useRef<[number, number]>(playbackRateRange);
  const fadeRangeRef = useRef<[number, number]>(fadeRange);
  const scaleRef = useRef<ScaleName>(selectedScale);

  const [blobEvents, setBlobEvents] = useState<(BlobEvent | null)[]>(() =>
    Array(numBlobs).fill(null)
  );

  const audioSource = useAudioSource();

  const createScheduler = useCallback(
    (blobIndex: number) => {
      const scheduler = () => {
        if (
          !audioCtxRef.current ||
          !compressorRef.current ||
          !isPlayingRef.current ||
          !audioSource.getBuffer()
        )
          return;

        const ctx = audioCtxRef.current;
        const buffer = audioSource.getBuffer()!;
        const compressor = compressorRef.current;

        const scheduleAheadTime = 0.1;
        const blob = blobRefs.current[blobIndex];

        while (
          blob?.nextBlobTime &&
          blob.nextBlobTime < ctx.currentTime + scheduleAheadTime
        ) {
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

          const [minFade, maxFade] = fadeRangeRef.current;
          const randomFade = Math.random() * (maxFade - minFade) + minFade;
          const fadeTime = Math.min(randomFade, actualPlayTime / 2);

          const coinFlip = Math.random() < 0.5;
          const pan = { start: coinFlip ? -1 : 1, rampTo: coinFlip ? 1 : -1 };

          const maxOffset = Math.max(0, buffer.duration - actualPlayTime);
          const randomOffset = Math.random() * maxOffset;
          const gain = 0.8;

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
            const u = [...prev];
            u[blobIndex] = event;
            return u;
          });

          playBlobAtTime(
            ctx,
            buffer,
            blob.nextBlobTime,
            randomDuration,
            randomPlaybackRate,
            gain,
            compressor,
            fadeTime,
            pan,
            randomOffset
          );

          blob.nextBlobTime += randomDuration - fadeTime;
        }

        requestAnimationFrame(scheduler);
      };
      return scheduler;
    },
    [audioSource]
  );

  useEffect(() => {
    const currentRefs = blobRefs.current;
    const newRefs = [...currentRefs];
    if (numBlobs > currentRefs.length) {
      newRefs.push(
        ...Array.from({ length: numBlobs - currentRefs.length }, () => ({
          nextBlobTime: 0,
        }))
      );
    } else if (numBlobs < currentRefs.length) {
      newRefs.length = numBlobs;
    }
    blobRefs.current = newRefs;

    setBlobEvents((prev) => {
      const next = [...prev];
      if (numBlobs > prev.length)
        next.push(...Array(numBlobs - prev.length).fill(null));
      else if (numBlobs < prev.length) next.length = numBlobs;
      return next;
    });

    if (isPlayingRef.current && audioCtxRef.current) {
      for (let i = currentRefs.length; i < numBlobs; i++) {
        blobRefs.current[i].nextBlobTime = audioCtxRef.current.currentTime;
        const scheduler = createScheduler(i);
        scheduler();
      }
    }
  }, [numBlobs, createScheduler]);

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

  const ensureBus = (ctx: AudioContext) => {
    if (!masterRef.current) {
      const master = ctx.createGain();
      master.gain.value = 1.0;
      master.connect(ctx.destination);
      masterRef.current = master;
    }
    if (!compressorRef.current) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-24, ctx.currentTime);
      comp.knee.setValueAtTime(30, ctx.currentTime);
      comp.ratio.setValueAtTime(12, ctx.currentTime);
      comp.attack.setValueAtTime(0.003, ctx.currentTime);
      comp.release.setValueAtTime(0.25, ctx.currentTime);
      comp.connect(masterRef.current);
      compressorRef.current = comp;
    }
  };

  const ensureRecorderWorklet = async (ctx: AudioContext) => {
    // serves from /public/worklets/recorder.js
    await ctx.audioWorklet.addModule(
      `${import.meta.env.BASE_URL}worklets/recorder.js`
    );
  };

  /**
   * Synchronize blobularBuffer (from S3/AudioBufferProvider) with audioSource (legacy system)
   * This ensures that when users select S3 audio files, they're available to the audio engine
   */
  useEffect(() => {
    if (blobularBuffer) {
      audioSource.setBuffer(blobularBuffer);
    }
  }, [blobularBuffer, audioSource]);

  const start = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = getAudioCtx(); // shared 48k context
    }
    const ctx = audioCtxRef.current;
    ensureBus(ctx);

    if (!audioSource.getBuffer()) {
      if (blobularBuffer) {
        audioSource.setBuffer(blobularBuffer);
      } else {
        const url = `${import.meta.env.BASE_URL}audio/LongHorn.wav`;
        const resp = await fetch(url);
        const abuf = await resp.arrayBuffer();
        const decoded = await ctx.decodeAudioData(abuf);
        audioSource.setBuffer(decoded);
      }
    }

    isPlayingRef.current = true;
    const t = ctx.currentTime;
    blobRefs.current.forEach((blob, index) => {
      blob.nextBlobTime = t;
      createScheduler(index)();
    });
  };

  const stop = () => {
    isPlayingRef.current = false;
  };

  // ----- MIC-ONLY RECORDING API -----

  const startMic = async () => {
    const ctx = audioCtxRef.current ?? getAudioCtx();
    audioCtxRef.current = ctx;
    ensureBus(ctx);

    if (micNodeRef.current) return; // already started

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    micNodeRef.current = new MediaStreamAudioSourceNode(ctx, {
      mediaStream: stream,
    });

    // optional self-monitor (muted by default)
    const mon = ctx.createGain();
    mon.gain.value = 0.0;
    micMonitorRef.current = mon;
    micNodeRef.current.connect(mon).connect(masterRef.current!);
  };

  const startMicRecording = async (onData?: (chunk: Float32Array) => void) => {
    const ctx = audioCtxRef.current ?? getAudioCtx();
    audioCtxRef.current = ctx;
    ensureBus(ctx);
    await ensureRecorderWorklet(ctx);
    if (!micNodeRef.current) await startMic();

    if (!micRecorderRef.current) {
      micRecorderRef.current = new AudioWorkletNode(ctx, "recorder", {
        numberOfInputs: 1,
        numberOfOutputs: 0,
      });
      micRecorderRef.current.port.onmessage = (e) =>
        onData?.(e.data as Float32Array);
    }

    // record ONLY the mic (no mix tap)
    micNodeRef.current!.connect(micRecorderRef.current);
  };

  const stopMicRecording = () => {
    if (micNodeRef.current && micRecorderRef.current) {
      try {
        micNodeRef.current.disconnect(micRecorderRef.current);
      } catch {
        // ignore if already disconnected
      }
    }
  };

  const setMicMonitorLevel = (v: number) => {
    if (micMonitorRef.current) micMonitorRef.current.gain.value = v;
  };

  return {
    start,
    stop,
    blobEvents,
    // mic-only recording controls
    startMic,
    startMicRecording,
    stopMicRecording,
    setMicMonitorLevel,
  };
};
