export const playBlobAtTime = (
  ctx: AudioContext,
  buffer: AudioBuffer,
  time: number,
  duration: number,
  playbackRate: number
) => {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, time);

  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  const fadeDuration = 0.3;
  const maxOffset = Math.max(0, buffer.duration - duration);
  const randomOffset = Math.random() * maxOffset;

  gainNode.gain.linearRampToValueAtTime(0.8, time + fadeDuration);
  gainNode.gain.setValueAtTime(0.8, time + duration - fadeDuration);
  gainNode.gain.linearRampToValueAtTime(0, time + duration);

  source.start(time, randomOffset, duration);

  source.onended = () => {
    source.disconnect();
    gainNode.disconnect();
  };
};
