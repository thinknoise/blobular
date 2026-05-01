import { useEffect, useRef, useState, useCallback } from "react";
import { playBlobAtTime } from "@/shared/utils/audio/playBlobAtTime";
import { getAudioCtx } from "@/shared/utils/audio/audioCtx";
import type { BlobEvent } from "@/shared/types/types";
import type { ScaleName } from "@/shared/constants/scales";
import { useAudioBuffer } from "@/hooks/useAudioBuffer";
import { controlLimits } from "@/shared/constants/controlLimits";
import { useAudioSource } from "../engine";
import {
  blobularEngineConfig,
  createBlobSchedule,
} from "../engine/blobularScheduling";

export const useBlobularEngine = (
  numBlobs: number = controlLimits.DEFAULT_BLOBS,
  durationRange: [number, number] = controlLimits.DEFAULT_DURATION_RANGE,
  playbackRateRange: [
    number,
    number,
  ] = controlLimits.DEFAULT_PLAYBACK_RATE_RANGE,
  fadeRange: [number, number] = controlLimits.DEFAULT_FADE_RANGE,
  selectedScale: ScaleName = controlLimits.DEFAULT_SCALE
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

        const blob = blobRefs.current[blobIndex];

        while (
          blob?.nextBlobTime &&
          blob.nextBlobTime <
            ctx.currentTime + blobularEngineConfig.scheduleAheadTime
        ) {
          const { event, nextBlobTime, gain } = createBlobSchedule({
            blobIndex,
            scheduledTime: blob.nextBlobTime,
            durationRange: durationRangeRef.current,
            playbackRateRange: playbackRateRangeRef.current,
            fadeRange: fadeRangeRef.current,
            bufferDuration: buffer.duration,
            selectedScale: scaleRef.current,
          });

          setBlobEvents((prev) => {
            const u = [...prev];
            u[blobIndex] = event;
            return u;
          });

          playBlobAtTime(
            ctx,
            buffer,
            blob.nextBlobTime,
            event.duration,
            event.playbackRate,
            gain,
            compressor,
            event.fadeTime,
            event.pan,
            event.offset
          );

          blob.nextBlobTime = nextBlobTime;
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
      comp.threshold.setValueAtTime(
        blobularEngineConfig.compressor.threshold,
        ctx.currentTime
      );
      comp.knee.setValueAtTime(
        blobularEngineConfig.compressor.knee,
        ctx.currentTime
      );
      comp.ratio.setValueAtTime(
        blobularEngineConfig.compressor.ratio,
        ctx.currentTime
      );
      comp.attack.setValueAtTime(
        blobularEngineConfig.compressor.attack,
        ctx.currentTime
      );
      comp.release.setValueAtTime(
        blobularEngineConfig.compressor.release,
        ctx.currentTime
      );
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

    // Ensure audio buffer is available from dual buffer system
    if (!audioSource.getBuffer()) {
      if (blobularBuffer) {
        audioSource.setBuffer(blobularBuffer);
      } else {
        console.warn(
          "No audio buffer available - please select an audio file from the menu"
        );
        return;
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
      audio: blobularEngineConfig.micConstraints,
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
