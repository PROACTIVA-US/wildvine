import { definePluginEntry } from "wildvine/plugin-sdk/plugin-entry";
import type { AnyAgentTool, WildvinePluginApi, WildvinePluginToolFactory } from "./runtime-api.js";
import { createVineTool } from "./src/vine-tool.js";

export default definePluginEntry({
  id: "vine",
  name: "Vine",
  description: "Optional local shell helper tools",
  register(api: WildvinePluginApi) {
    api.registerTool(
      ((ctx) => {
        if (ctx.sandboxed) {
          return null;
        }
        return createVineTool(api) as AnyAgentTool;
      }) as WildvinePluginToolFactory,
      { optional: true },
    );
  },
});
