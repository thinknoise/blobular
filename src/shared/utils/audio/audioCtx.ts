// src/utils/audioCtx.ts

let audioCtx: AudioContext | null = null;

function createAudioCtx(): AudioContext {
  console.log("CREATING AUDIO CONTEXT");
  audioCtx = new AudioContext();
  return audioCtx;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let _ctx: AudioContext | null = null;

export function getAudioCtx() {
  if (_ctx) return _ctx;
  const AC = window.AudioContext || window.webkitAudioContext!;
  _ctx = new AC({
    latencyHint: "interactive",
    sampleRate: 48000, // prefer 48k for mic/WebRTC paths
  });
  // iOS/Safari: ensure resumed on user gesture elsewhere too
  const tryResume = () => _ctx!.state === "suspended" && _ctx!.resume();
  document.addEventListener("click", tryResume, { once: true, capture: true });
  return _ctx!;
}

export async function resumeAudioCtx(): Promise<void> {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

export function closeAudioCtx(): void {
  if (audioCtx) {
    audioCtx.close().then(() => {
      audioCtx = null;
    });
  }
}

export function resetAudioCtx(): void {
  if (audioCtx) {
    audioCtx.close().then(() => {
      createAudioCtx();
    });
  } else {
    createAudioCtx();
  }
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
