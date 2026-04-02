// Private runtime barrel for the bundled Signal extension.
// Prefer narrower SDK subpaths plus local extension seams over the legacy signal barrel.

export type { ChannelMessageActionAdapter } from "wildvine/plugin-sdk/channel-contract";
export { SignalConfigSchema } from "wildvine/plugin-sdk/channel-config-schema";
export { PAIRING_APPROVED_MESSAGE } from "wildvine/plugin-sdk/channel-status";
import type { WildvineConfig as RuntimeWildvineConfig } from "wildvine/plugin-sdk/config-runtime";
export type { RuntimeWildvineConfig as WildvineConfig };
export type { WildvinePluginApi, PluginRuntime } from "wildvine/plugin-sdk/core";
export type { ChannelPlugin } from "wildvine/plugin-sdk/core";
export {
  DEFAULT_ACCOUNT_ID,
  applyAccountNameToChannelSection,
  buildChannelConfigSchema,
  deleteAccountFromConfigSection,
  emptyPluginConfigSchema,
  formatPairingApproveHint,
  getChatChannelMeta,
  migrateBaseNameToDefaultAccount,
  normalizeAccountId,
  setAccountEnabledInConfigSection,
} from "wildvine/plugin-sdk/core";
export { resolveChannelMediaMaxBytes } from "wildvine/plugin-sdk/media-runtime";
export { formatCliCommand, formatDocsLink } from "wildvine/plugin-sdk/setup-tools";
export { chunkText } from "wildvine/plugin-sdk/reply-runtime";
export { detectBinary, installSignalCli } from "wildvine/plugin-sdk/setup-tools";
export {
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
} from "wildvine/plugin-sdk/config-runtime";
export {
  buildBaseAccountStatusSnapshot,
  buildBaseChannelStatusSummary,
  collectStatusIssuesFromLastError,
  createDefaultChannelRuntimeState,
} from "wildvine/plugin-sdk/status-helpers";
export { normalizeE164 } from "wildvine/plugin-sdk/text-runtime";
export { looksLikeSignalTargetId, normalizeSignalMessagingTarget } from "./normalize.js";
export {
  listEnabledSignalAccounts,
  listSignalAccountIds,
  resolveDefaultSignalAccountId,
  resolveSignalAccount,
} from "./accounts.js";
export { monitorSignalProvider } from "./monitor.js";
export { probeSignal } from "./probe.js";
export { resolveSignalReactionLevel } from "./reaction-level.js";
export { removeReactionSignal, sendReactionSignal } from "./send-reactions.js";
export { sendMessageSignal } from "./send.js";
export { signalMessageActions } from "./message-actions.js";
export type { ResolvedSignalAccount } from "./accounts.js";
export type SignalAccountConfig = Omit<
  Exclude<NonNullable<RuntimeWildvineConfig["channels"]>["signal"], undefined>,
  "accounts"
>;
