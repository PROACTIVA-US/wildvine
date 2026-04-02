import { describe, expect, it } from "vitest";
import type { WildvineConfig } from "../config/config.js";
import { resolveHookEnableState, resolveHookEntries } from "./policy.js";
import type { HookEntry, HookSource } from "./types.js";

function makeHookEntry(name: string, source: HookSource): HookEntry {
  return {
    hook: {
      name,
      description: `${name} description`,
      source,
      filePath: `/tmp/${source}/${name}/HOOK.md`,
      baseDir: `/tmp/${source}/${name}`,
      handlerPath: `/tmp/${source}/${name}/handler.js`,
    },
    frontmatter: {
      name,
    },
    metadata: {
      events: ["command:new"],
    },
    invocation: {
      enabled: true,
    },
  };
}

describe("hook policy", () => {
  describe("resolveHookEnableState", () => {
    it("keeps workspace hooks disabled by default", () => {
      const entry = makeHookEntry("workspace-hook", "wildvine-workspace");
      expect(resolveHookEnableState({ entry })).toEqual({
        enabled: false,
        reason: "workspace hook (disabled by default)",
      });
    });

    it("allows workspace hooks when explicitly enabled", () => {
      const entry = makeHookEntry("workspace-hook", "wildvine-workspace");
      const config: WildvineConfig = {
        hooks: {
          internal: {
            entries: {
              "workspace-hook": {
                enabled: true,
              },
            },
          },
        },
      };
      expect(resolveHookEnableState({ entry, config })).toEqual({ enabled: true });
    });

    it("keeps plugin hooks enabled without local hook toggles", () => {
      const entry = makeHookEntry("plugin-hook", "wildvine-plugin");
      expect(resolveHookEnableState({ entry })).toEqual({ enabled: true });
    });
  });

  describe("resolveHookEntries", () => {
    it("lets managed hooks override bundled and plugin hooks", () => {
      const bundled = makeHookEntry("shared", "wildvine-bundled");
      const plugin = makeHookEntry("shared", "wildvine-plugin");
      const managed = makeHookEntry("shared", "wildvine-managed");

      const resolved = resolveHookEntries([bundled, plugin, managed]);
      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.hook.source).toBe("wildvine-managed");
    });

    it("prevents workspace hooks from overriding non-workspace hooks", () => {
      const managed = makeHookEntry("shared", "wildvine-managed");
      const workspace = makeHookEntry("shared", "wildvine-workspace");

      const resolved = resolveHookEntries([managed, workspace]);
      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.hook.source).toBe("wildvine-managed");
    });

    it("keeps later workspace entries for the same source/name", () => {
      const first = makeHookEntry("shared", "wildvine-workspace");
      const second = makeHookEntry("shared", "wildvine-workspace");
      second.hook.handlerPath = "/tmp/wildvine-workspace/shared/handler-2.js";

      const resolved = resolveHookEntries([first, second]);
      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.hook.handlerPath).toContain("handler-2");
    });
  });
});
