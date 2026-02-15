import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveDefaultConfigCandidates,
  resolveConfigPathCandidate,
  resolveConfigPath,
  resolveOAuthDir,
  resolveOAuthPath,
  resolveStateDir,
} from "./paths.js";

describe("oauth paths", () => {
  it("prefers WILDVINE_OAUTH_DIR over WILDVINE_STATE_DIR", () => {
    const env = {
      WILDVINE_OAUTH_DIR: "/custom/oauth",
      WILDVINE_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.resolve("/custom/oauth"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join(path.resolve("/custom/oauth"), "oauth.json"),
    );
  });

  it("derives oauth path from WILDVINE_STATE_DIR when unset", () => {
    const env = {
      WILDVINE_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.join("/custom/state", "credentials"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join("/custom/state", "credentials", "oauth.json"),
    );
  });
});

describe("state + config path candidates", () => {
  it("uses WILDVINE_STATE_DIR when set", () => {
    const env = {
      WILDVINE_STATE_DIR: "/new/state",
    } as NodeJS.ProcessEnv;

    expect(resolveStateDir(env, () => "/home/test")).toBe(path.resolve("/new/state"));
  });

  it("uses WILDVINE_HOME for default state/config locations", () => {
    const env = {
      WILDVINE_HOME: "/srv/wildvine-home",
    } as NodeJS.ProcessEnv;

    const resolvedHome = path.resolve("/srv/wildvine-home");
    expect(resolveStateDir(env)).toBe(path.join(resolvedHome, ".wildvine"));

    const candidates = resolveDefaultConfigCandidates(env);
    expect(candidates[0]).toBe(path.join(resolvedHome, ".wildvine", "wildvine.json"));
  });

  it("prefers WILDVINE_HOME over HOME for default state/config locations", () => {
    const env = {
      WILDVINE_HOME: "/srv/wildvine-home",
      HOME: "/home/other",
    } as NodeJS.ProcessEnv;

    const resolvedHome = path.resolve("/srv/wildvine-home");
    expect(resolveStateDir(env)).toBe(path.join(resolvedHome, ".wildvine"));

    const candidates = resolveDefaultConfigCandidates(env);
    expect(candidates[0]).toBe(path.join(resolvedHome, ".wildvine", "wildvine.json"));
  });

  it("orders default config candidates in a stable order", () => {
    const home = "/home/test";
    const resolvedHome = path.resolve(home);
    const candidates = resolveDefaultConfigCandidates({} as NodeJS.ProcessEnv, () => home);
    const expected = [
      path.join(resolvedHome, ".wildvine", "wildvine.json"),
      path.join(resolvedHome, ".wildvine", "wildvinebot.json"),
      path.join(resolvedHome, ".wildvine", "moldbot.json"),
      path.join(resolvedHome, ".wildvine", "moltbot.json"),
      path.join(resolvedHome, ".wildvinebot", "wildvine.json"),
      path.join(resolvedHome, ".wildvinebot", "wildvinebot.json"),
      path.join(resolvedHome, ".wildvinebot", "moldbot.json"),
      path.join(resolvedHome, ".wildvinebot", "moltbot.json"),
      path.join(resolvedHome, ".moldbot", "wildvine.json"),
      path.join(resolvedHome, ".moldbot", "wildvinebot.json"),
      path.join(resolvedHome, ".moldbot", "moldbot.json"),
      path.join(resolvedHome, ".moldbot", "moltbot.json"),
      path.join(resolvedHome, ".moltbot", "wildvine.json"),
      path.join(resolvedHome, ".moltbot", "wildvinebot.json"),
      path.join(resolvedHome, ".moltbot", "moldbot.json"),
      path.join(resolvedHome, ".moltbot", "moltbot.json"),
    ];
    expect(candidates).toEqual(expected);
  });

  it("prefers ~/.wildvine when it exists and legacy dir is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "wildvine-state-"));
    try {
      const newDir = path.join(root, ".wildvine");
      await fs.mkdir(newDir, { recursive: true });
      const resolved = resolveStateDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(newDir);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("CONFIG_PATH prefers existing config when present", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "wildvine-config-"));
    try {
      const legacyDir = path.join(root, ".wildvine");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyPath = path.join(legacyDir, "wildvine.json");
      await fs.writeFile(legacyPath, "{}", "utf-8");

      const resolved = resolveConfigPathCandidate({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(legacyPath);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("respects state dir overrides when config is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "wildvine-config-override-"));
    try {
      const legacyDir = path.join(root, ".wildvine");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyConfig = path.join(legacyDir, "wildvine.json");
      await fs.writeFile(legacyConfig, "{}", "utf-8");

      const overrideDir = path.join(root, "override");
      const env = { WILDVINE_STATE_DIR: overrideDir } as NodeJS.ProcessEnv;
      const resolved = resolveConfigPath(env, overrideDir, () => root);
      expect(resolved).toBe(path.join(overrideDir, "wildvine.json"));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
