// Narrow plugin-sdk surface for the bundled diffs plugin.
// Keep this list additive and scoped to the bundled diffs surface.

export { definePluginEntry } from "./plugin-entry.js";
export type { WildvineConfig } from "../config/config.js";
export { resolvePreferredWildvineTmpDir } from "../infra/tmp-wildvine-dir.js";
export type {
  AnyAgentTool,
  WildvinePluginApi,
  WildvinePluginConfigSchema,
  WildvinePluginToolContext,
  PluginLogger,
} from "../plugins/types.js";
