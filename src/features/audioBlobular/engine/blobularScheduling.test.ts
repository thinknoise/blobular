import { describe, expect, it, vi } from "vitest";
import {
  createBlobSchedule,
  getRandomScalePlaybackRate,
} from "./blobularScheduling";

describe("blobularScheduling", () => {
  it("falls back to neutral playback rate when no notes fit the range", () => {
    const rate = getRandomScalePlaybackRate(1, 1, new Set([1]), () => 0);
    expect(rate).toBe(1);
  });

  it("creates deterministic scheduling data from pure inputs", () => {
    const randomValues = [0.5, 0.25, 0.8, 0.4];
    const random = vi.fn(() => randomValues.shift() ?? 0);
    const now = vi.fn(() => 123456);

    const schedule = createBlobSchedule({
      blobIndex: 2,
      scheduledTime: 10,
      durationRange: [1, 3],
      playbackRateRange: [1, 1],
      fadeRange: [0.2, 1.2],
      bufferDuration: 12,
      selectedScale: "MajorChord",
      random,
      now,
    });

    expect(schedule.event.blobIndex).toBe(2);
    expect(schedule.event.scheduledTime).toBe(10);
    expect(schedule.event.duration).toBe(2);
    expect(schedule.event.playbackRate).toBe(1);
    expect(schedule.event.fadeTime).toBe(1);
    expect(schedule.event.pan).toEqual({ start: -1, rampTo: 1 });
    expect(schedule.event.offset).toBe(0);
    expect(schedule.event.timestamp).toBe(123456);
    expect(schedule.nextBlobTime).toBe(11);
  });
});
