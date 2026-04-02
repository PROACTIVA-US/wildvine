import type { PluginRuntime } from "wildvine/plugin-sdk/core";
import { createPluginRuntimeStore } from "wildvine/plugin-sdk/runtime-store";

const { setRuntime: setQQBotRuntime, getRuntime: getQQBotRuntime } =
  createPluginRuntimeStore<PluginRuntime>("QQBot runtime not initialized");
export { getQQBotRuntime, setQQBotRuntime };
