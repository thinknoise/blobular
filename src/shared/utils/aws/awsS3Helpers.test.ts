import { GetObjectCommand } from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("./awsConfig", () => ({
  BUCKET: "test-bucket",
  s3: {
    send,
  },
}));

import { getAudioArrayBuffer } from "./awsS3Helpers";

describe("awsS3Helpers", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("reads S3 bodies via transformToByteArray when available", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);

    send.mockResolvedValue({
      Body: {
        transformToByteArray: vi.fn().mockResolvedValue(bytes),
      },
    });

    const result = await getAudioArrayBuffer("audio-pond/test-transform.wav");

    expect(Array.from(new Uint8Array(result))).toEqual([1, 2, 3, 4]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
  });

  it("falls back to arrayBuffer-capable bodies", async () => {
    send.mockResolvedValue({
      Body: {
        arrayBuffer: vi
          .fn()
          .mockResolvedValue(new Uint8Array([5, 6, 7]).buffer),
      },
    });

    const result = await getAudioArrayBuffer("audio-pond/test-blob.wav");

    expect(Array.from(new Uint8Array(result))).toEqual([5, 6, 7]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
