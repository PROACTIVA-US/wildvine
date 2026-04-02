export const WILDVINE_CLI_ENV_VAR = "WILDVINE_CLI";
export const WILDVINE_CLI_ENV_VALUE = "1";

export function markWildvineExecEnv<T extends Record<string, string | undefined>>(env: T): T {
  return {
    ...env,
    [WILDVINE_CLI_ENV_VAR]: WILDVINE_CLI_ENV_VALUE,
  };
}

export function ensureWildvineExecMarkerOnProcess(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  env[WILDVINE_CLI_ENV_VAR] = WILDVINE_CLI_ENV_VALUE;
  return env;
}
