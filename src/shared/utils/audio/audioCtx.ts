// src/utils/audioCtx.ts

let audioCtx: AudioContext | null = null;

function createAudioCtx(): AudioContext {
  console.log("CREATING AUDIO CONTEXT");
  audioCtx = new AudioContext();
  return audioCtx;
}

export function getAudioCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    return createAudioCtx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
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
