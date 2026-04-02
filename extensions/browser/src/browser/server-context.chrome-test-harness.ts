import { vi } from "vitest";
import { installChromeUserDataDirHooks } from "./chrome-user-data-dir.test-harness.js";

const chromeUserDataDir = { dir: "/tmp/wildvine" };
installChromeUserDataDirHooks(chromeUserDataDir);

vi.mock("./chrome.js", () => ({
  isChromeCdpReady: vi.fn(async () => true),
  isChromeReachable: vi.fn(async () => true),
  launchWildvineChrome: vi.fn(async () => {
    throw new Error("unexpected launch");
  }),
  resolveWildvineUserDataDir: vi.fn(() => chromeUserDataDir.dir),
  stopWildvineChrome: vi.fn(async () => {}),
}));
