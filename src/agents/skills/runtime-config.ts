import { getRuntimeConfigSnapshot, type WildvineConfig } from "../../config/config.js";

export function resolveSkillRuntimeConfig(config?: WildvineConfig): WildvineConfig | undefined {
  return getRuntimeConfigSnapshot() ?? config;
}
