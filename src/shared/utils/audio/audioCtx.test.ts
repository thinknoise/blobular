import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAudioCtx, closeAudioCtx } from "./audioCtx";

class FakeAudioContext {
  public state: "suspended" | "running" | "closed" = "suspended";
  resume = vi.fn().mockImplementation(() => {
    this.state = "running";
    return Promise.resolve();
  });
  close = vi.fn().mockImplementation(() => {
    this.state = "closed";
    return Promise.resolve();
  });
}

describe("audioCtx", () => {
  beforeEach(() => {
    // @ts-expect-error - assign stub
    window.AudioContext = FakeAudioContext;
    // Ensure standard constructor is used
    window.webkitAudioContext = undefined;
  });

  afterEach(async () => {
    await closeAudioCtx();
  });

  it("creates a new context after closing", async () => {
    const ctx1 = getAudioCtx();
    await closeAudioCtx();
    const ctx2 = getAudioCtx();
    expect(ctx2).not.toBe(ctx1);
  });
});
