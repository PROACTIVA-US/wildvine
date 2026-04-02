import type { PluginRuntime } from "wildvine/plugin-sdk/core";
import { createPluginRuntimeStore } from "wildvine/plugin-sdk/runtime-store";

const { setRuntime: setDiscordRuntime, getRuntime: getDiscordRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Discord runtime not initialized");
export { getDiscordRuntime, setDiscordRuntime };
