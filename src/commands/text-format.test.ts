import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("wildvine", 16)).toBe("wildvine");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("wildvine-status-output", 10)).toBe("wildvine-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});
