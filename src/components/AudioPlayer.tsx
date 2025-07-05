// src/components/AudioGranularPlayer.tsx

import { useRef } from "react";

const AudioGranularPlayer = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);
  const nextGrainTimeRef = useRef(0);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // ✅ Play a single grain at a scheduled time
  const playGrainAtTime = (
    buffer: AudioBuffer,
    time: number,
    duration: number,
    playbackRate: number
  ) => {
    if (!audioCtxRef.current) return;

    const ctx = audioCtxRef.current;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const fadeDuration = 0.8; // 500ms fade

    const maxOffset = Math.max(0, buffer.duration - duration);
    const randomOffset = Math.random() * maxOffset;

    // Fade in
    gainNode.gain.linearRampToValueAtTime(0.5, time + fadeDuration);

    // Fade out
    gainNode.gain.setValueAtTime(0.5, time + duration - fadeDuration);
    gainNode.gain.linearRampToValueAtTime(0, time + duration);

    source.start(time, randomOffset, duration);

    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };
  };

  // ✅ Scheduler loop using requestAnimationFrame
  const scheduler = () => {
    if (
      !audioCtxRef.current ||
      !isPlayingRef.current ||
      !audioBufferRef.current
    )
      return;

    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    const scheduleAheadTime = 0.1; // seconds

    while (nextGrainTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const randomDuration = Math.random() * 3 + 0.8; // 500ms to 3500ms
      const randomPlaybackRate = Math.random() * 0.2 + 0.9; // 0.9x to 1.1x

      console.log(
        nextGrainTimeRef.current.toFixed(2),
        randomDuration.toFixed(2),
        randomPlaybackRate.toFixed(2)
      );

      playGrainAtTime(
        buffer,
        nextGrainTimeRef.current,
        randomDuration,
        randomPlaybackRate
      );

      const grainInterval = 0.1; // 100ms between grains
      nextGrainTimeRef.current += grainInterval;
    }

    requestAnimationFrame(scheduler);
  };

  // ✅ Start granular engine
  const startGranular = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    } else if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }

    if (!audioBufferRef.current) {
      const response = await fetch("/audio/Deutsche4.wav");
      const arrayBuffer = await response.arrayBuffer();
      audioBufferRef.current =
        await audioCtxRef.current.decodeAudioData(arrayBuffer);
    }

    isPlayingRef.current = true;
    nextGrainTimeRef.current = audioCtxRef.current.currentTime;
    scheduler();
  };

  // ✅ Stop granular engine
  const stopGranular = () => {
    isPlayingRef.current = false;
  };

  return (
    <div>
      <button onClick={startGranular}>Start Granular</button>
      <button onClick={stopGranular}>Stop Granular</button>
    </div>
  );
};

export default AudioGranularPlayer;
