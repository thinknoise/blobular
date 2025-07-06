export const playBlobAtTime = (
  ctx: AudioContext,
  buffer: AudioBuffer,
  time: number,
  duration: number, // desired slice length in buffer-time
  playbackRate: number,
  gain: number,
  compressor: DynamicsCompressorNode,
  fadeTime: number,
  randomOffset: number = 0
) => {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  const gainNode = ctx.createGain();
  const epsilon = 0.0001;

  // Real-world duration = requested duration ÷ speed
  const actualPlayTime = duration / playbackRate;

  // Clear any old automation
  gainNode.gain.cancelScheduledValues(time);

  // 1) Fade-in from epsilon → gain over fadeTime
  gainNode.gain.setValueAtTime(epsilon, time);
  gainNode.gain.exponentialRampToValueAtTime(gain, time + fadeTime);

  // 2) Release start and fade-out back to epsilon
  const releaseStart = time + actualPlayTime - fadeTime;
  gainNode.gain.setValueAtTime(gain, releaseStart);
  gainNode.gain.exponentialRampToValueAtTime(epsilon, time + actualPlayTime);

  source.connect(gainNode);
  gainNode.connect(compressor);

  // schedule playback of buffer slice (duration is buffer-time)
  source.start(time, randomOffset, duration);
  // no explicit stop: source auto-stops after playing the buffer slice

  source.onended = () => {
    source.disconnect();
    gainNode.disconnect();
  };
};
