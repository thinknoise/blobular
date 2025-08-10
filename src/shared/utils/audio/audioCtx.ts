// src/utils/audioCtx.ts

// Maintain a single AudioContext instance and expose helpers to manage it.
// A previous version of this module accidentally tracked the context in two
// separate variables which meant functions like `closeAudioCtx` and
// `resetAudioCtx` operated on a different reference than `getAudioCtx`. As a
// result the context was never actually closed or reset. We now keep a single
// `audioCtx` reference that all helpers share.

let audioCtx: AudioContext | null = null;

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export function getAudioCtx() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext!;
  audioCtx = new AC({
    latencyHint: "interactive",
    sampleRate: 48000, // prefer 48k for mic/WebRTC paths
  });
  // iOS/Safari: ensure resumed on user gesture elsewhere too
  const tryResume = () => audioCtx!.state === "suspended" && audioCtx!.resume();
  document.addEventListener("click", tryResume, { once: true, capture: true });
  return audioCtx!;
}

export async function resumeAudioCtx(): Promise<void> {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

export async function closeAudioCtx(): Promise<void> {
  if (audioCtx) {
    await audioCtx.close();
    audioCtx = null;
  }
}

export async function resetAudioCtx(): Promise<void> {
  await closeAudioCtx();
  getAudioCtx();
}

export function isAudioCtxRunning(): boolean {
  return !!audioCtx && audioCtx.state === "running";
}

export function isAudioCtxSuspended(): boolean {
  return !!audioCtx && audioCtx.state === "suspended";
}

export function isAudioCtxClosed(): boolean {
  return !audioCtx || audioCtx.state === "closed";
}
