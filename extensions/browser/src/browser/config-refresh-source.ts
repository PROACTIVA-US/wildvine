import { createConfigIO, getRuntimeConfigSnapshot, type WildvineConfig } from "../config/config.js";

export function loadBrowserConfigForRuntimeRefresh(): WildvineConfig {
  return getRuntimeConfigSnapshot() ?? createConfigIO().loadConfig();
}
