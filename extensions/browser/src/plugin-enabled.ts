import type { WildvineConfig } from "wildvine/plugin-sdk/browser-support";
import {
  normalizePluginsConfig,
  resolveEffectiveEnableState,
} from "wildvine/plugin-sdk/browser-support";

export function isDefaultBrowserPluginEnabled(cfg: WildvineConfig): boolean {
  return resolveEffectiveEnableState({
    id: "browser",
    origin: "bundled",
    config: normalizePluginsConfig(cfg.plugins),
    rootConfig: cfg,
    enabledByDefault: true,
  }).enabled;
}
