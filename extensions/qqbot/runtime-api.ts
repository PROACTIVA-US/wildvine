export type { ChannelPlugin, WildvinePluginApi, PluginRuntime } from "wildvine/plugin-sdk/core";
export type { WildvineConfig } from "wildvine/plugin-sdk/config-runtime";
export type {
  WildvinePluginService,
  WildvinePluginServiceContext,
  PluginLogger,
} from "wildvine/plugin-sdk/core";
export type { ResolvedQQBotAccount, QQBotAccountConfig } from "./src/types.js";
export { getQQBotRuntime, setQQBotRuntime } from "./src/runtime.js";
