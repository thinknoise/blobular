import { SCALE_DEGREE_MAP, type ScaleName } from "@/shared/constants/scales";
import type { BlobEvent } from "@/shared/types/types";

const DEFAULT_SCALE_DEGREES = new Set([0, 2, 4, 5, 7, 9, 11]);

export const blobularEngineConfig = {
  scheduleAheadTime: 0.1,
  blobGain: 0.8,
  compressor: {
    threshold: -24,
    knee: 30,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
  },
  micConstraints: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
} as const;

export type BlobSchedule = {
  event: BlobEvent;
  nextBlobTime: number;
  gain: number;
};

export function getRandomScalePlaybackRate(
  minRate: number,
  maxRate: number,
  degrees: ReadonlySet<number> = DEFAULT_SCALE_DEGREES,
  random: () => number = Math.random
): number {
  const minSemi = Math.ceil(12 * Math.log2(minRate));
  const maxSemi = Math.floor(12 * Math.log2(maxRate));
  const candidates: number[] = [];

  for (let semi = minSemi; semi <= maxSemi; semi += 1) {
    const mod12 = ((semi % 12) + 12) % 12;
    if (degrees.has(mod12)) {
      candidates.push(semi);
    }
  }

  if (candidates.length === 0) {
    return 1;
  }

  const index = Math.floor(random() * candidates.length);
  return 2 ** (candidates[index] / 12);
}

export function createBlobSchedule(params: {
  blobIndex: number;
  scheduledTime: number;
  durationRange: [number, number];
  playbackRateRange: [number, number];
  fadeRange: [number, number];
  bufferDuration: number;
  selectedScale: ScaleName;
  random?: () => number;
  now?: () => number;
}): BlobSchedule {
  const random = params.random ?? Math.random;
  const now = params.now ?? Date.now;
  const [minDuration, maxDuration] = params.durationRange;
  const duration = random() * (maxDuration - minDuration) + minDuration;

  const playbackRate = getRandomScalePlaybackRate(
    params.playbackRateRange[0],
    params.playbackRateRange[1],
    SCALE_DEGREE_MAP[params.selectedScale],
    random
  );
  const actualPlayTime = duration / playbackRate;

  const [minFade, maxFade] = params.fadeRange;
  const rawFade = random() * (maxFade - minFade) + minFade;
  const fadeTime = Math.min(rawFade, actualPlayTime / 2);

  const startLeft = random() < 0.5;
  const pan = {
    start: startLeft ? -1 : 1,
    rampTo: startLeft ? 1 : -1,
  };

  const maxOffset = Math.max(0, params.bufferDuration - actualPlayTime);
  const offset = random() * maxOffset;

  return {
    event: {
      blobIndex: params.blobIndex,
      scheduledTime: params.scheduledTime,
      duration,
      playbackRate,
      fadeTime,
      pan,
      timestamp: now(),
      offset,
    },
    nextBlobTime: params.scheduledTime + duration - fadeTime,
    gain: blobularEngineConfig.blobGain,
  };
}
