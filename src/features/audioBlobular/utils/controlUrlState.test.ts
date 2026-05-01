import { describe, expect, it } from "vitest";
import {
  buildControlsUrl,
  getInitialControlsFromSearch,
} from "./controlUrlState";
import { createControlsState } from "./controlState";

describe("controlUrlState", () => {
  it("parses blobular control state from the query string", () => {
    const initial = getInitialControlsFromSearch(
      "?blobs=12&duration=0.50-4.00&sampleRate=0.75-1.50&scale=minorchord"
    );

    expect(initial).toEqual({
      numBlobs: { value: 12 },
      duration: { range: [0.5, 4] },
      playbackRate: { range: [0.75, 1.5] },
      selectedScale: "MinorChord",
    });
  });

  it("ignores invalid blob counts instead of creating invalid control state", () => {
    const initial = getInitialControlsFromSearch("?blobs=not-a-number");
    expect(initial).toEqual({});
  });

  it("serializes control state back into the existing URL", () => {
    const controls = createControlsState({
      numBlobs: { value: 6, min: 1, max: 20, step: 1 },
      duration: { range: [0.8, 3.2] },
      playbackRate: { range: [0.9, 1.4] },
      selectedScale: "Blues",
    });

    expect(
      buildControlsUrl("/blobular", "?view=compact", controls)
    ).toBe(
      "/blobular?view=compact&blobs=6&duration=0.80-3.20&sampleRate=0.90-1.40&scale=Blues"
    );
  });
});
