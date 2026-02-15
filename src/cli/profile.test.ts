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

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "wildvine", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (dev first)", () => {
    const res = parseCliProfileArgs(["node", "wildvine", "--dev", "--profile", "work", "status"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (profile first)", () => {
    const res = parseCliProfileArgs(["node", "wildvine", "--profile", "work", "--dev", "status"]);
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
  it("returns command unchanged when no profile is set", () => {
    expect(formatCliCommand("wildvine doctor --fix", {})).toBe("wildvine doctor --fix");
  });

  it("returns command unchanged when profile is default", () => {
    expect(formatCliCommand("wildvine doctor --fix", { WILDVINE_PROFILE: "default" })).toBe(
      "wildvine doctor --fix",
    );
  });

  it("returns command unchanged when profile is Default (case-insensitive)", () => {
    expect(formatCliCommand("wildvine doctor --fix", { WILDVINE_PROFILE: "Default" })).toBe(
      "wildvine doctor --fix",
    );
  });

  it("returns command unchanged when profile is invalid", () => {
    expect(formatCliCommand("wildvine doctor --fix", { WILDVINE_PROFILE: "bad profile" })).toBe(
      "wildvine doctor --fix",
    );
  });

  it("returns command unchanged when --profile is already present", () => {
    expect(
      formatCliCommand("wildvine --profile work doctor --fix", { WILDVINE_PROFILE: "work" }),
    ).toBe("wildvine --profile work doctor --fix");
  });

  it("returns command unchanged when --dev is already present", () => {
    expect(formatCliCommand("wildvine --dev doctor", { WILDVINE_PROFILE: "dev" })).toBe(
      "wildvine --dev doctor",
    );
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
});
