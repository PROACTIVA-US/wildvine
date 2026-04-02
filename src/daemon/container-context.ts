export function resolveDaemonContainerContext(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env.WILDVINE_CONTAINER_HINT?.trim() || env.WILDVINE_CONTAINER?.trim() || null;
}
