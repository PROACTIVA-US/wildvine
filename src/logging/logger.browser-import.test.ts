import { afterEach, describe, expect, it, vi } from "vitest";

type LoggerModule = typeof import("./logger.js");

const originalGetBuiltinModule = (
  process as NodeJS.Process & { getBuiltinModule?: (id: string) => unknown }
).getBuiltinModule;

async function importBrowserSafeLogger(params?: {
  resolvePreferredWildvineTmpDir?: ReturnType<typeof vi.fn>;
}): Promise<{
  module: LoggerModule;
  resolvePreferredWildvineTmpDir: ReturnType<typeof vi.fn>;
}> {
  vi.resetModules();
  const resolvePreferredWildvineTmpDir =
    params?.resolvePreferredWildvineTmpDir ??
    vi.fn(() => {
      throw new Error("resolvePreferredWildvineTmpDir should not run during browser-safe import");
    });

  vi.doMock("../infra/tmp-wildvine-dir.js", async () => {
    const actual = await vi.importActual<typeof import("../infra/tmp-wildvine-dir.js")>(
      "../infra/tmp-wildvine-dir.js",
    );
    return {
      ...actual,
      resolvePreferredWildvineTmpDir,
    };
  });

  Object.defineProperty(process, "getBuiltinModule", {
    configurable: true,
    value: undefined,
  });

  const module = await import("./logger.js");
  return { module, resolvePreferredWildvineTmpDir };
}

describe("logging/logger browser-safe import", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../infra/tmp-wildvine-dir.js");
    Object.defineProperty(process, "getBuiltinModule", {
      configurable: true,
      value: originalGetBuiltinModule,
    });
  });

  it("does not resolve the preferred temp dir at import time when node fs is unavailable", async () => {
    const { module, resolvePreferredWildvineTmpDir } = await importBrowserSafeLogger();

    expect(resolvePreferredWildvineTmpDir).not.toHaveBeenCalled();
    expect(module.DEFAULT_LOG_DIR).toBe("/tmp/wildvine");
    expect(module.DEFAULT_LOG_FILE).toBe("/tmp/wildvine/wildvine.log");
  });

  it("disables file logging when imported in a browser-like environment", async () => {
    const { module, resolvePreferredWildvineTmpDir } = await importBrowserSafeLogger();

    expect(module.getResolvedLoggerSettings()).toMatchObject({
      level: "silent",
      file: "/tmp/wildvine/wildvine.log",
    });
    expect(module.isFileLogLevelEnabled("info")).toBe(false);
    expect(() => module.getLogger().info("browser-safe")).not.toThrow();
    expect(resolvePreferredWildvineTmpDir).not.toHaveBeenCalled();
  });
});
