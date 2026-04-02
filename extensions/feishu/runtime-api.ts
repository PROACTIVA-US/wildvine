// Private runtime barrel for the bundled Feishu extension.
// Keep this barrel thin and aligned with the local extension surface.

export type {
  ChannelMessageActionName,
  ChannelMeta,
  ChannelOutboundAdapter,
  WildvineConfig as ClawdbotConfig,
  WildvineConfig,
  WildvinePluginApi,
  PluginRuntime,
  RuntimeEnv,
} from "wildvine/plugin-sdk/feishu";
export {
  DEFAULT_ACCOUNT_ID,
  PAIRING_APPROVED_MESSAGE,
  buildChannelConfigSchema,
  buildProbeChannelStatusSummary,
  createActionGate,
  createDefaultChannelRuntimeState,
} from "wildvine/plugin-sdk/feishu";
export * from "wildvine/plugin-sdk/feishu";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "wildvine/plugin-sdk/webhook-ingress";
