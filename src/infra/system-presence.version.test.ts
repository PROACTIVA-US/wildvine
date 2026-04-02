import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withEnvAsync } from "../test-utils/env.js";

vi.unmock("../version.js");

async function withPresenceModule<T>(
  env: Record<string, string | undefined>,
  run: (module: typeof import("./system-presence.js")) => Promise<T> | T,
): Promise<T> {
  return withEnvAsync(
    {
      WILDVINE_VERSION: undefined,
      WILDVINE_SERVICE_VERSION: undefined,
      npm_package_version: undefined,
      ...env,
    },
    async () => {
      vi.resetModules();
      const module = await import("./system-presence.js");
      return await run(module);
    },
  );
}

describe("system-presence version fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function expectSelfVersion(
    env: Record<string, string | undefined>,
    expectedVersion: string | (() => Promise<string>),
  ) {
    await withPresenceModule(env, async ({ listSystemPresence }) => {
      const selfEntry = listSystemPresence().find((entry) => entry.reason === "self");
      const resolvedExpected =
        typeof expectedVersion === "function" ? await expectedVersion() : expectedVersion;
      expect(selfEntry?.version).toBe(resolvedExpected);
    });
  }

  it("uses runtime VERSION when WILDVINE_VERSION is not set", async () => {
    await expectSelfVersion(
      {
        WILDVINE_SERVICE_VERSION: "2.4.6-service",
        npm_package_version: "1.0.0-package",
      },
      async () => (await import("../version.js")).VERSION,
    );
  });

  it("prefers WILDVINE_VERSION over runtime VERSION", async () => {
    await expectSelfVersion(
      {
        WILDVINE_VERSION: "9.9.9-cli",
        WILDVINE_SERVICE_VERSION: "2.4.6-service",
        npm_package_version: "1.0.0-package",
      },
      "9.9.9-cli",
    );
  });

  it("still prefers runtime VERSION over WILDVINE_SERVICE_VERSION when WILDVINE_VERSION is blank", async () => {
    await expectSelfVersion(
      {
        WILDVINE_VERSION: " ",
        WILDVINE_SERVICE_VERSION: "2.4.6-service",
        npm_package_version: "1.0.0-package",
      },
      async () => (await import("../version.js")).VERSION,
    );
  });

  it("still prefers runtime VERSION over npm_package_version when service markers are blank", async () => {
    await expectSelfVersion(
      {
        WILDVINE_VERSION: " ",
        WILDVINE_SERVICE_VERSION: "\t",
        npm_package_version: "1.0.0-package",
      },
      async () => (await import("../version.js")).VERSION,
    );
  });

  it("uses runtime VERSION when WILDVINE_VERSION and WILDVINE_SERVICE_VERSION are blank", async () => {
    await expectSelfVersion(
      {
        WILDVINE_VERSION: " ",
        WILDVINE_SERVICE_VERSION: "\t",
        npm_package_version: "1.0.0-package",
      },
      async () => (await import("../version.js")).VERSION,
    );
  });

  it("falls back to hostname when self-presence LAN discovery throws", async () => {
    await withEnvAsync({}, async () => {
      vi.spyOn(os, "hostname").mockReturnValue("test-host");
      vi.spyOn(os, "networkInterfaces").mockImplementation(() => {
        throw new Error("uv_interface_addresses failed");
      });
      vi.resetModules();
      const module = await import("./system-presence.js");
      const selfEntry = module.listSystemPresence().find((entry) => entry.reason === "self");
      expect(selfEntry?.host).toBe("test-host");
      expect(selfEntry?.ip).toBe("test-host");
    });
  });
});
