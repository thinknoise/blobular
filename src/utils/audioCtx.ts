// src/utils/audioCtx.ts

let audioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
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
      audioCtx = new AudioContext();
    });
  } else {
    audioCtx = new AudioContext();
  }
}
export function isAudioCtxRunning(): boolean {
  return audioCtx !== null && audioCtx.state === "running";
}
export function isAudioCtxSuspended(): boolean {
  return audioCtx !== null && audioCtx.state === "suspended";
}
export function isAudioCtxClosed(): boolean {
  return audioCtx === null || audioCtx.state === "closed";
}
