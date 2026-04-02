import { describe, expect, it } from "vitest";
import { normalizePackageTagInput } from "./package-tag.js";

describe("normalizePackageTagInput", () => {
  const packageNames = ["wildvine", "@wildvine/plugin"] as const;

  it.each([
    { input: undefined, expected: null },
    { input: "   ", expected: null },
    { input: "wildvine@beta", expected: "beta" },
    { input: "@wildvine/plugin@2026.2.24", expected: "2026.2.24" },
    { input: "wildvine@   ", expected: null },
    { input: "wildvine", expected: null },
    { input: " @wildvine/plugin ", expected: null },
    { input: " latest ", expected: "latest" },
    { input: "@other/plugin@beta", expected: "@other/plugin@beta" },
    { input: "wildvineer@beta", expected: "wildvineer@beta" },
  ] satisfies ReadonlyArray<{ input: string | undefined; expected: string | null }>)(
    "normalizes %j",
    ({ input, expected }) => {
      expect(normalizePackageTagInput(input, packageNames)).toBe(expected);
    },
  );
});
