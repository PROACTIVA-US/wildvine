import type { WildvineConfig } from "./config.js";

export function ensurePluginAllowlisted(cfg: WildvineConfig, pluginId: string): WildvineConfig {
  const allow = cfg.plugins?.allow;
  if (!Array.isArray(allow) || allow.includes(pluginId)) {
    return cfg;
  }
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow: [...allow, pluginId],
    },
  };
}
