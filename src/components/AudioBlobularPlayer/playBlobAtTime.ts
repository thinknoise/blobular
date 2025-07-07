export const playBlobAtTime = (
  ctx: AudioContext,
  buffer: AudioBuffer,
  time: number,
  duration: number, // desired wall-clock play time (in seconds)
  playbackRate: number,
  gain: number,
  compressor: DynamicsCompressorNode,
  fadeTime: number, // max desired fade (in seconds)
  randomOffset: number = 0 // buffer-time offset (in seconds)
) => {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  // Compute how many buffer-seconds we need to get `duration` seconds of wall-clock time
  const neededBufferSeconds = duration * playbackRate;

  // Clamp to what's actually available after our offset
  const maxAvailable = Math.max(0, buffer.duration - randomOffset);
  const sliceDuration = Math.min(neededBufferSeconds, maxAvailable);

  // This is the true wall-clock play time you’ll get
  const actualPlayTime = sliceDuration / playbackRate;

  // Ensure fade never exceeds half the real play time
  // todo: guardrails on the other side in UI
  const effectiveFade = Math.min(fadeTime, actualPlayTime / 2);

  const gainNode = ctx.createGain();
  const epsilon = 0.0001;

  // Clear any old automation
  gainNode.gain.cancelScheduledValues(time);

  // 1) Fade-in from epsilon → gain
  gainNode.gain.setValueAtTime(epsilon, time);
  gainNode.gain.exponentialRampToValueAtTime(gain, time + effectiveFade);

  // 2) Fade-out back to epsilon
  const releaseStart = time + actualPlayTime - effectiveFade;
  gainNode.gain.setValueAtTime(gain, releaseStart);
  gainNode.gain.exponentialRampToValueAtTime(epsilon, time + actualPlayTime);

  // Wire up and schedule playback of the right buffer slice
  source.connect(gainNode);
  gainNode.connect(compressor);
  source.start(time, randomOffset, sliceDuration);

  source.onended = () => {
    source.disconnect();
    gainNode.disconnect();
  };
};
