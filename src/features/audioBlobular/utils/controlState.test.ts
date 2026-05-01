import { describe, expect, it } from "vitest";
import {
  applyBufferDuration,
  applyRangeControlUpdate,
  createControlsState,
} from "./controlState";

describe("controlState", () => {
  it("uses the configured default scale", () => {
    const controls = createControlsState();
    expect(controls.selectedScale).toBe("MajorChord");
  });

  it("keeps fade within the duration start when duration changes", () => {
    const controls = createControlsState({
      duration: { range: [0.8, 5] },
      fade: { range: [0.1, 1.2] },
    });

    const next = applyRangeControlUpdate(controls, "duration", [0.5, 4]);

    expect(next.duration.range).toEqual([0.5, 4]);
    expect(next.fade.range).toEqual([0.1, 0.5]);
  });

  it("pushes duration up when fade exceeds the current duration start", () => {
    const controls = createControlsState({
      duration: { range: [0.8, 5] },
      fade: { range: [0.1, 0.4] },
    });

    const next = applyRangeControlUpdate(controls, "fade", [0.2, 1.5]);

    expect(next.fade.range).toEqual([0.2, 1.5]);
    expect(next.duration.range).toEqual([1.5, 5]);
  });

  it("clamps duration to the loaded buffer length", () => {
    const controls = createControlsState({
      duration: { range: [2, 8] },
      fade: { range: [0.1, 1.5] },
    });

    const next = applyBufferDuration(controls, 1.2);

    expect(next.duration.max).toBe(1.2);
    expect(next.duration.range).toEqual([1.2, 1.2]);
    expect(next.fade.range).toEqual([0.1, 1.2]);
  });
});
