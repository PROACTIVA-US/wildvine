import type { PluginRuntime } from "wildvine/plugin-sdk/core";
import { createPluginRuntimeStore } from "wildvine/plugin-sdk/runtime-store";

const { setRuntime: setIMessageRuntime, getRuntime: getIMessageRuntime } =
  createPluginRuntimeStore<PluginRuntime>("iMessage runtime not initialized");
export { getIMessageRuntime, setIMessageRuntime };
