import { describe, expect, it } from "vitest";
import { validateConfigObject } from "./config.js";

describe("talk.voiceAliases", () => {
  it("accepts a string map of voice aliases", () => {
    const res = validateConfigObject({
      talk: {
        voiceAliases: {
          Wildvine: "EXAVITQu4vr4xnSDxMaL",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
      },
    });
    expect(res.ok).toBe(true);
  });

  it("rejects non-string voice alias values", () => {
    const res = validateConfigObject({
      talk: {
        voiceAliases: {
          Wildvine: 123,
        },
      },
    });
    expect(res.ok).toBe(false);
  });
});
