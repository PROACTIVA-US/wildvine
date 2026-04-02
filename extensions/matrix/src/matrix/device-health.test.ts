import { describe, expect, it } from "vitest";
import { isWildvineManagedMatrixDevice, summarizeMatrixDeviceHealth } from "./device-health.js";

describe("matrix device health", () => {
  it("detects Wildvine-managed device names", () => {
    expect(isWildvineManagedMatrixDevice("Wildvine Gateway")).toBe(true);
    expect(isWildvineManagedMatrixDevice("Wildvine Debug")).toBe(true);
    expect(isWildvineManagedMatrixDevice("Element iPhone")).toBe(false);
    expect(isWildvineManagedMatrixDevice(null)).toBe(false);
  });

  it("summarizes stale Wildvine-managed devices separately from the current device", () => {
    const summary = summarizeMatrixDeviceHealth([
      {
        deviceId: "du314Zpw3A",
        displayName: "Wildvine Gateway",
        current: true,
      },
      {
        deviceId: "BritdXC6iL",
        displayName: "Wildvine Gateway",
        current: false,
      },
      {
        deviceId: "G6NJU9cTgs",
        displayName: "Wildvine Debug",
        current: false,
      },
      {
        deviceId: "phone123",
        displayName: "Element iPhone",
        current: false,
      },
    ]);

    expect(summary.currentDeviceId).toBe("du314Zpw3A");
    expect(summary.currentWildvineDevices).toEqual([
      expect.objectContaining({ deviceId: "du314Zpw3A" }),
    ]);
    expect(summary.staleWildvineDevices).toEqual([
      expect.objectContaining({ deviceId: "BritdXC6iL" }),
      expect.objectContaining({ deviceId: "G6NJU9cTgs" }),
    ]);
  });
});
