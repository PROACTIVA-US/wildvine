import type { PluginRuntime } from "wildvine/plugin-sdk/plugin-runtime";
import { createPluginRuntimeStore } from "wildvine/plugin-sdk/runtime-store";

const { setRuntime: setTlonRuntime, getRuntime: getTlonRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Tlon runtime not initialized");
export { getTlonRuntime, setTlonRuntime };
