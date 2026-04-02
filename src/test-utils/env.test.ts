import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  captureEnv,
  captureFullEnv,
  createPathResolutionEnv,
  withEnv,
  withEnvAsync,
  withPathResolutionEnv,
} from "./env.js";

function restoreEnvKey(key: string, previous: string | undefined): void {
  if (previous === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = previous;
  }
}

describe("env test utils", () => {
  it("captureEnv restores mutated keys", () => {
    const keyA = "WILDVINE_ENV_TEST_A";
    const keyB = "WILDVINE_ENV_TEST_B";
    const snapshot = captureEnv([keyA, keyB]);
    const prevA = process.env[keyA];
    const prevB = process.env[keyB];
    process.env[keyA] = "mutated";
    delete process.env[keyB];

    snapshot.restore();

    expect(process.env[keyA]).toBe(prevA);
    expect(process.env[keyB]).toBe(prevB);
  });

  it("captureFullEnv restores added keys and baseline values", () => {
    const key = "WILDVINE_ENV_TEST_ADDED";
    const prevHome = process.env.HOME;
    const snapshot = captureFullEnv();
    process.env[key] = "1";
    delete process.env.HOME;

    snapshot.restore();

    expect(process.env[key]).toBeUndefined();
    expect(process.env.HOME).toBe(prevHome);
  });

  it("withEnv applies values only inside callback", () => {
    const key = "WILDVINE_ENV_TEST_SYNC";
    const prev = process.env[key];

    const seen = withEnv({ [key]: "inside" }, () => process.env[key]);

    expect(seen).toBe("inside");
    expect(process.env[key]).toBe(prev);
  });

  it("withEnv restores values when callback throws", () => {
    const key = "WILDVINE_ENV_TEST_SYNC_THROW";
    const prev = process.env[key];

    expect(() =>
      withEnv({ [key]: "inside" }, () => {
        expect(process.env[key]).toBe("inside");
        throw new Error("boom");
      }),
    ).toThrow("boom");

    expect(process.env[key]).toBe(prev);
  });

  it("withEnv can delete a key only inside callback", () => {
    const key = "WILDVINE_ENV_TEST_SYNC_DELETE";
    const prev = process.env[key];
    process.env[key] = "outer";

    const seen = withEnv({ [key]: undefined }, () => process.env[key]);

    expect(seen).toBeUndefined();
    expect(process.env[key]).toBe("outer");
    restoreEnvKey(key, prev);
  });

  it("withEnvAsync restores values when callback throws", async () => {
    const key = "WILDVINE_ENV_TEST_ASYNC";
    const prev = process.env[key];

    await expect(
      withEnvAsync({ [key]: "inside" }, async () => {
        expect(process.env[key]).toBe("inside");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(process.env[key]).toBe(prev);
  });

  it("withEnvAsync applies values only inside async callback", async () => {
    const key = "WILDVINE_ENV_TEST_ASYNC_OK";
    const prev = process.env[key];

    const seen = await withEnvAsync({ [key]: "inside" }, async () => process.env[key]);

    expect(seen).toBe("inside");
    expect(process.env[key]).toBe(prev);
  });

  it("withEnvAsync can delete a key only inside callback", async () => {
    const key = "WILDVINE_ENV_TEST_ASYNC_DELETE";
    const prev = process.env[key];
    process.env[key] = "outer";

    const seen = await withEnvAsync({ [key]: undefined }, async () => process.env[key]);

    expect(seen).toBeUndefined();
    expect(process.env[key]).toBe("outer");
    restoreEnvKey(key, prev);
  });

  it("createPathResolutionEnv clears leaked path overrides before applying explicit ones", () => {
    const homeDir = path.join(path.sep, "tmp", "wildvine-home");
    const resolvedHomeDir = path.resolve(homeDir);
    const previousWildvineHome = process.env.WILDVINE_HOME;
    const previousStateDir = process.env.WILDVINE_STATE_DIR;
    const previousBundledDir = process.env.WILDVINE_BUNDLED_PLUGINS_DIR;
    process.env.WILDVINE_HOME = "/srv/wildvine-home";
    process.env.WILDVINE_STATE_DIR = "/srv/wildvine-state";
    process.env.WILDVINE_BUNDLED_PLUGINS_DIR = "/srv/wildvine-bundled";

    try {
      const env = createPathResolutionEnv(homeDir, {
        WILDVINE_STATE_DIR: "~/state",
      });

      expect(env.HOME).toBe(resolvedHomeDir);
      expect(env.WILDVINE_HOME).toBeUndefined();
      expect(env.WILDVINE_BUNDLED_PLUGINS_DIR).toBeUndefined();
      expect(env.WILDVINE_STATE_DIR).toBe("~/state");
    } finally {
      restoreEnvKey("WILDVINE_HOME", previousWildvineHome);
      restoreEnvKey("WILDVINE_STATE_DIR", previousStateDir);
      restoreEnvKey("WILDVINE_BUNDLED_PLUGINS_DIR", previousBundledDir);
    }
  });

  it("withPathResolutionEnv only applies the explicit path env inside the callback", () => {
    const homeDir = path.join(path.sep, "tmp", "wildvine-home");
    const resolvedHomeDir = path.resolve(homeDir);
    const previousWildvineHome = process.env.WILDVINE_HOME;
    process.env.WILDVINE_HOME = "/srv/wildvine-home";

    try {
      const seen = withPathResolutionEnv(
        homeDir,
        { WILDVINE_BUNDLED_PLUGINS_DIR: "~/bundled" },
        (env) => ({
          processHome: process.env.HOME,
          processWildvineHome: process.env.WILDVINE_HOME,
          processBundledDir: process.env.WILDVINE_BUNDLED_PLUGINS_DIR,
          envBundledDir: env.WILDVINE_BUNDLED_PLUGINS_DIR,
        }),
      );

      expect(seen).toEqual({
        processHome: resolvedHomeDir,
        processWildvineHome: undefined,
        processBundledDir: "~/bundled",
        envBundledDir: "~/bundled",
      });
      expect(process.env.WILDVINE_HOME).toBe("/srv/wildvine-home");
    } finally {
      restoreEnvKey("WILDVINE_HOME", previousWildvineHome);
    }
  });
});
