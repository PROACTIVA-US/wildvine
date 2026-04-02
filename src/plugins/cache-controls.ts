export const DEFAULT_PLUGIN_DISCOVERY_CACHE_MS = 1000;
export const DEFAULT_PLUGIN_MANIFEST_CACHE_MS = 1000;

export function shouldUsePluginSnapshotCache(env: NodeJS.ProcessEnv): boolean {
  if (env.WILDVINE_DISABLE_PLUGIN_DISCOVERY_CACHE?.trim()) {
    return false;
  }
  if (env.WILDVINE_DISABLE_PLUGIN_MANIFEST_CACHE?.trim()) {
    return false;
  }
  const discoveryCacheMs = env.WILDVINE_PLUGIN_DISCOVERY_CACHE_MS?.trim();
  if (discoveryCacheMs === "0") {
    return false;
  }
  const manifestCacheMs = env.WILDVINE_PLUGIN_MANIFEST_CACHE_MS?.trim();
  if (manifestCacheMs === "0") {
    return false;
  }
  return true;
}

export function resolvePluginCacheMs(rawValue: string | undefined, defaultMs: number): number {
  const raw = rawValue?.trim();
  if (raw === "" || raw === "0") {
    return 0;
  }
  if (!raw) {
    return defaultMs;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return defaultMs;
  }
  return Math.max(0, parsed);
}

export function resolvePluginSnapshotCacheTtlMs(env: NodeJS.ProcessEnv): number {
  const discoveryCacheMs = resolvePluginCacheMs(
    env.WILDVINE_PLUGIN_DISCOVERY_CACHE_MS,
    DEFAULT_PLUGIN_DISCOVERY_CACHE_MS,
  );
  const manifestCacheMs = resolvePluginCacheMs(
    env.WILDVINE_PLUGIN_MANIFEST_CACHE_MS,
    DEFAULT_PLUGIN_MANIFEST_CACHE_MS,
  );
  return Math.min(discoveryCacheMs, manifestCacheMs);
}

export function buildPluginSnapshotCacheEnvKey(env: NodeJS.ProcessEnv) {
  return {
    WILDVINE_BUNDLED_PLUGINS_DIR: env.WILDVINE_BUNDLED_PLUGINS_DIR ?? "",
    WILDVINE_DISABLE_PLUGIN_DISCOVERY_CACHE: env.WILDVINE_DISABLE_PLUGIN_DISCOVERY_CACHE ?? "",
    WILDVINE_DISABLE_PLUGIN_MANIFEST_CACHE: env.WILDVINE_DISABLE_PLUGIN_MANIFEST_CACHE ?? "",
    WILDVINE_PLUGIN_DISCOVERY_CACHE_MS: env.WILDVINE_PLUGIN_DISCOVERY_CACHE_MS ?? "",
    WILDVINE_PLUGIN_MANIFEST_CACHE_MS: env.WILDVINE_PLUGIN_MANIFEST_CACHE_MS ?? "",
    WILDVINE_HOME: env.WILDVINE_HOME ?? "",
    WILDVINE_STATE_DIR: env.WILDVINE_STATE_DIR ?? "",
    WILDVINE_CONFIG_PATH: env.WILDVINE_CONFIG_PATH ?? "",
    HOME: env.HOME ?? "",
    USERPROFILE: env.USERPROFILE ?? "",
    VITEST: env.VITEST ?? "",
  };
}
