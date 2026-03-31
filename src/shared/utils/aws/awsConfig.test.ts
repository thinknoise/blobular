import { describe, expect, it } from "vitest";

import { REGION, s3 } from "./awsConfig";

describe("awsConfig", () => {
  it("uses the expected browser S3 settings", async () => {
    expect(await s3.config.region()).toBe(REGION);
    expect(await s3.config.requestChecksumCalculation()).toBe("WHEN_REQUIRED");
  });
});
