import type {
  AnyAgentTool,
  WildvinePluginApi,
  WildvinePluginToolFactory,
} from "../../src/plugins/types.js";
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: WildvinePluginApi) {
  api.registerTool(
    ((ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api) as AnyAgentTool;
    }) as WildvinePluginToolFactory,
    { optional: true },
  );
}
