import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateCheckResult } from "./update-check.js";

vi.mock("./wildvine-root.js", () => ({
  resolveWildvinePackageRoot: vi.fn(),
}));

vi.mock("./update-check.js", async () => {
  const actual = await vi.importActual<typeof import("./update-check.js")>("./update-check.js");
  return {
    ...actual,
    checkUpdateStatus: vi.fn(),
    fetchNpmTagVersion: vi.fn(),
    resolveNpmChannelTag: vi.fn(),
  };
});

vi.mock("../version.js", () => ({
  VERSION: "1.0.0",
}));

describe("update-startup", () => {
  const originalEnv = { ...process.env };
  let suiteRoot = "";
  let suiteCase = 0;
  let tempDir: string;

  let resolveWildvinePackageRoot: (typeof import("./wildvine-root.js"))["resolveWildvinePackageRoot"];
  let checkUpdateStatus: (typeof import("./update-check.js"))["checkUpdateStatus"];
  let resolveNpmChannelTag: (typeof import("./update-check.js"))["resolveNpmChannelTag"];
  let runGatewayUpdateCheck: (typeof import("./update-startup.js"))["runGatewayUpdateCheck"];
  let loaded = false;

  beforeAll(async () => {
    suiteRoot = await fs.mkdtemp(path.join(os.tmpdir(), "wildvine-update-check-suite-"));
  });

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-17T10:00:00Z"));
    tempDir = path.join(suiteRoot, `case-${++suiteCase}`);
    await fs.mkdir(tempDir, { recursive: true });
    process.env.WILDVINE_STATE_DIR = tempDir;
    delete process.env.VITEST;
    process.env.NODE_ENV = "test";

    // Perf: load mocked modules once (after timers/env are set up).
    if (!loaded) {
      ({ resolveWildvinePackageRoot } = await import("./wildvine-root.js"));
      ({ checkUpdateStatus, resolveNpmChannelTag } = await import("./update-check.js"));
      ({ runGatewayUpdateCheck } = await import("./update-startup.js"));
      loaded = true;
    }
  });

  afterEach(async () => {
    vi.useRealTimers();
    process.env = { ...originalEnv };
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    if (suiteRoot) {
      await fs.rm(suiteRoot, { recursive: true, force: true });
    }
    suiteRoot = "";
    suiteCase = 0;
  });

  it("logs update hint for npm installs when newer tag exists", async () => {
    vi.mocked(resolveWildvinePackageRoot).mockResolvedValue("/opt/wildvine");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/wildvine",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "2.0.0",
    });

    const log = { info: vi.fn() };
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log,
      isNixMode: false,
      allowInTests: true,
    });

    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining("update available (latest): v2.0.0"),
    );

    const statePath = path.join(tempDir, "update-check.json");
    const raw = await fs.readFile(statePath, "utf-8");
    const parsed = JSON.parse(raw) as { lastNotifiedVersion?: string };
    expect(parsed.lastNotifiedVersion).toBe("2.0.0");
  });

  it("uses latest when beta tag is older than release", async () => {
    vi.mocked(resolveWildvinePackageRoot).mockResolvedValue("/opt/wildvine");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/wildvine",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "2.0.0",
    });

    const log = { info: vi.fn() };
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "beta" } },
      log,
      isNixMode: false,
      allowInTests: true,
    });

    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining("update available (latest): v2.0.0"),
    );

    const statePath = path.join(tempDir, "update-check.json");
    const raw = await fs.readFile(statePath, "utf-8");
    const parsed = JSON.parse(raw) as { lastNotifiedTag?: string };
    expect(parsed.lastNotifiedTag).toBe("latest");
  });

  it("skips update check when disabled in config", async () => {
    const log = { info: vi.fn() };

    await runGatewayUpdateCheck({
      cfg: { update: { checkOnStart: false } },
      log,
      isNixMode: false,
      allowInTests: true,
    });

    expect(log.info).not.toHaveBeenCalled();
    await expect(fs.stat(path.join(tempDir, "update-check.json"))).rejects.toThrow();
  });
});
