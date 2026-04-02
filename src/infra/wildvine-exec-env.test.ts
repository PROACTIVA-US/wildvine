import { describe, expect, it } from "vitest";
import {
  ensureWildvineExecMarkerOnProcess,
  markWildvineExecEnv,
  WILDVINE_CLI_ENV_VALUE,
  WILDVINE_CLI_ENV_VAR,
} from "./wildvine-exec-env.js";

describe("markWildvineExecEnv", () => {
  it("returns a cloned env object with the exec marker set", () => {
    const env = { PATH: "/usr/bin", WILDVINE_CLI: "0" };
    const marked = markWildvineExecEnv(env);

    expect(marked).toEqual({
      PATH: "/usr/bin",
      WILDVINE_CLI: WILDVINE_CLI_ENV_VALUE,
    });
    expect(marked).not.toBe(env);
    expect(env.WILDVINE_CLI).toBe("0");
  });
});

describe("ensureWildvineExecMarkerOnProcess", () => {
  it.each([
    {
      name: "mutates and returns the provided process env",
      env: { PATH: "/usr/bin" } as NodeJS.ProcessEnv,
    },
    {
      name: "overwrites an existing marker on the provided process env",
      env: { PATH: "/usr/bin", [WILDVINE_CLI_ENV_VAR]: "0" } as NodeJS.ProcessEnv,
    },
  ])("$name", ({ env }) => {
    expect(ensureWildvineExecMarkerOnProcess(env)).toBe(env);
    expect(env[WILDVINE_CLI_ENV_VAR]).toBe(WILDVINE_CLI_ENV_VALUE);
  });

  it("defaults to mutating process.env when no env object is provided", () => {
    const previous = process.env[WILDVINE_CLI_ENV_VAR];
    delete process.env[WILDVINE_CLI_ENV_VAR];

    try {
      expect(ensureWildvineExecMarkerOnProcess()).toBe(process.env);
      expect(process.env[WILDVINE_CLI_ENV_VAR]).toBe(WILDVINE_CLI_ENV_VALUE);
    } finally {
      if (previous === undefined) {
        delete process.env[WILDVINE_CLI_ENV_VAR];
      } else {
        process.env[WILDVINE_CLI_ENV_VAR] = previous;
      }
    }
  });
});
