import type { PluginRuntime } from "wildvine/plugin-sdk/core";
import { createPluginRuntimeStore } from "wildvine/plugin-sdk/runtime-store";

const {
  setRuntime: setSignalRuntime,
  clearRuntime: clearSignalRuntime,
  getRuntime: getSignalRuntime,
} = createPluginRuntimeStore<PluginRuntime>("Signal runtime not initialized");
export { clearSignalRuntime, getSignalRuntime, setSignalRuntime };
