// Private Vine plugin helpers for bundled extensions.
// Keep this surface narrow and limited to the Vine workflow/tool contract.

export { definePluginEntry } from "./plugin-entry.js";
export {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "./windows-spawn.js";
export type {
  AnyAgentTool,
  WildvinePluginApi,
  WildvinePluginToolContext,
  WildvinePluginToolFactory,
} from "../plugins/types.js";
