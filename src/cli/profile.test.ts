import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "wildvine",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "wildvine", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("leaves gateway --dev for subcommands after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "wildvine",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "wildvine",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "wildvine", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "wildvine", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "wildvine", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "wildvine", "status"]);
  });

  it("parses interleaved --profile after the command token", () => {
    const res = parseCliProfileArgs(["node", "wildvine", "status", "--profile", "work", "--deep"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "wildvine", "status", "--deep"]);
  });

  it("parses interleaved --dev after the command token", () => {
    const res = parseCliProfileArgs(["node", "wildvine", "status", "--dev"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "wildvine", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "wildvine", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "wildvine", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "wildvine", "--profile", "work", "--dev", "status"]],
    ["interleaved after command", ["node", "wildvine", "status", "--profile", "work", "--dev"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".wildvine-dev");
    expect(env.WILDVINE_PROFILE).toBe("dev");
    expect(env.WILDVINE_STATE_DIR).toBe(expectedStateDir);
    expect(env.WILDVINE_CONFIG_PATH).toBe(path.join(expectedStateDir, "wildvine.json"));
    expect(env.WILDVINE_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      WILDVINE_STATE_DIR: "/custom",
      WILDVINE_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.WILDVINE_STATE_DIR).toBe("/custom");
    expect(env.WILDVINE_GATEWAY_PORT).toBe("19099");
    expect(env.WILDVINE_CONFIG_PATH).toBe(path.join("/custom", "wildvine.json"));
  });

  it("uses WILDVINE_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      WILDVINE_HOME: "/srv/wildvine-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/wildvine-home");
    expect(env.WILDVINE_STATE_DIR).toBe(path.join(resolvedHome, ".wildvine-work"));
    expect(env.WILDVINE_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".wildvine-work", "wildvine.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "wildvine doctor --fix",
      env: {},
      expected: "wildvine doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "wildvine doctor --fix",
      env: { WILDVINE_PROFILE: "default" },
      expected: "wildvine doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "wildvine doctor --fix",
      env: { WILDVINE_PROFILE: "Default" },
      expected: "wildvine doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "wildvine doctor --fix",
      env: { WILDVINE_PROFILE: "bad profile" },
      expected: "wildvine doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "wildvine --profile work doctor --fix",
      env: { WILDVINE_PROFILE: "work" },
      expected: "wildvine --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "wildvine --dev doctor",
      env: { WILDVINE_PROFILE: "dev" },
      expected: "wildvine --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("wildvine doctor --fix", { WILDVINE_PROFILE: "work" })).toBe(
      "wildvine --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("wildvine doctor --fix", { WILDVINE_PROFILE: "  jbwildvine  " })).toBe(
      "wildvine --profile jbwildvine doctor --fix",
    );
  });

  it("handles command with no args after wildvine", () => {
    expect(formatCliCommand("wildvine", { WILDVINE_PROFILE: "test" })).toBe(
      "wildvine --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm wildvine doctor", { WILDVINE_PROFILE: "work" })).toBe(
      "pnpm wildvine --profile work doctor",
    );
  });

  it("inserts --container when a container hint is set", () => {
    expect(
      formatCliCommand("wildvine gateway status --deep", { WILDVINE_CONTAINER_HINT: "demo" }),
    ).toBe("wildvine --container demo gateway status --deep");
  });

  it("preserves both --container and --profile hints", () => {
    expect(
      formatCliCommand("wildvine doctor", {
        WILDVINE_CONTAINER_HINT: "demo",
        WILDVINE_PROFILE: "work",
      }),
    ).toBe("wildvine --container demo doctor");
  });

  it("does not prepend --container for update commands", () => {
    expect(formatCliCommand("wildvine update", { WILDVINE_CONTAINER_HINT: "demo" })).toBe(
      "wildvine update",
    );
    expect(
      formatCliCommand("pnpm wildvine update --channel beta", { WILDVINE_CONTAINER_HINT: "demo" }),
    ).toBe("pnpm wildvine update --channel beta");
  });
});
