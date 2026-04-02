import type { WildvineConfig } from "../config/config.js";
import type { PluginRuntime } from "./runtime/types.js";
import type { WildvinePluginApi, PluginLogger } from "./types.js";

export type BuildPluginApiParams = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  rootDir?: string;
  registrationMode: WildvinePluginApi["registrationMode"];
  config: WildvineConfig;
  pluginConfig?: Record<string, unknown>;
  runtime: PluginRuntime;
  logger: PluginLogger;
  resolvePath: (input: string) => string;
  handlers?: Partial<
    Pick<
      WildvinePluginApi,
      | "registerTool"
      | "registerHook"
      | "registerHttpRoute"
      | "registerChannel"
      | "registerGatewayMethod"
      | "registerCli"
      | "registerService"
      | "registerCliBackend"
      | "registerProvider"
      | "registerSpeechProvider"
      | "registerMediaUnderstandingProvider"
      | "registerImageGenerationProvider"
      | "registerWebSearchProvider"
      | "registerInteractiveHandler"
      | "onConversationBindingResolved"
      | "registerCommand"
      | "registerContextEngine"
      | "registerMemoryPromptSection"
      | "registerMemoryFlushPlan"
      | "registerMemoryRuntime"
      | "registerMemoryEmbeddingProvider"
      | "on"
    >
  >;
};

const noopRegisterTool: WildvinePluginApi["registerTool"] = () => {};
const noopRegisterHook: WildvinePluginApi["registerHook"] = () => {};
const noopRegisterHttpRoute: WildvinePluginApi["registerHttpRoute"] = () => {};
const noopRegisterChannel: WildvinePluginApi["registerChannel"] = () => {};
const noopRegisterGatewayMethod: WildvinePluginApi["registerGatewayMethod"] = () => {};
const noopRegisterCli: WildvinePluginApi["registerCli"] = () => {};
const noopRegisterService: WildvinePluginApi["registerService"] = () => {};
const noopRegisterCliBackend: WildvinePluginApi["registerCliBackend"] = () => {};
const noopRegisterProvider: WildvinePluginApi["registerProvider"] = () => {};
const noopRegisterSpeechProvider: WildvinePluginApi["registerSpeechProvider"] = () => {};
const noopRegisterMediaUnderstandingProvider: WildvinePluginApi["registerMediaUnderstandingProvider"] =
  () => {};
const noopRegisterImageGenerationProvider: WildvinePluginApi["registerImageGenerationProvider"] =
  () => {};
const noopRegisterWebSearchProvider: WildvinePluginApi["registerWebSearchProvider"] = () => {};
const noopRegisterInteractiveHandler: WildvinePluginApi["registerInteractiveHandler"] = () => {};
const noopOnConversationBindingResolved: WildvinePluginApi["onConversationBindingResolved"] =
  () => {};
const noopRegisterCommand: WildvinePluginApi["registerCommand"] = () => {};
const noopRegisterContextEngine: WildvinePluginApi["registerContextEngine"] = () => {};
const noopRegisterMemoryPromptSection: WildvinePluginApi["registerMemoryPromptSection"] = () => {};
const noopRegisterMemoryFlushPlan: WildvinePluginApi["registerMemoryFlushPlan"] = () => {};
const noopRegisterMemoryRuntime: WildvinePluginApi["registerMemoryRuntime"] = () => {};
const noopRegisterMemoryEmbeddingProvider: WildvinePluginApi["registerMemoryEmbeddingProvider"] =
  () => {};
const noopOn: WildvinePluginApi["on"] = () => {};

export function buildPluginApi(params: BuildPluginApiParams): WildvinePluginApi {
  const handlers = params.handlers ?? {};
  return {
    id: params.id,
    name: params.name,
    version: params.version,
    description: params.description,
    source: params.source,
    rootDir: params.rootDir,
    registrationMode: params.registrationMode,
    config: params.config,
    pluginConfig: params.pluginConfig,
    runtime: params.runtime,
    logger: params.logger,
    registerTool: handlers.registerTool ?? noopRegisterTool,
    registerHook: handlers.registerHook ?? noopRegisterHook,
    registerHttpRoute: handlers.registerHttpRoute ?? noopRegisterHttpRoute,
    registerChannel: handlers.registerChannel ?? noopRegisterChannel,
    registerGatewayMethod: handlers.registerGatewayMethod ?? noopRegisterGatewayMethod,
    registerCli: handlers.registerCli ?? noopRegisterCli,
    registerService: handlers.registerService ?? noopRegisterService,
    registerCliBackend: handlers.registerCliBackend ?? noopRegisterCliBackend,
    registerProvider: handlers.registerProvider ?? noopRegisterProvider,
    registerSpeechProvider: handlers.registerSpeechProvider ?? noopRegisterSpeechProvider,
    registerMediaUnderstandingProvider:
      handlers.registerMediaUnderstandingProvider ?? noopRegisterMediaUnderstandingProvider,
    registerImageGenerationProvider:
      handlers.registerImageGenerationProvider ?? noopRegisterImageGenerationProvider,
    registerWebSearchProvider: handlers.registerWebSearchProvider ?? noopRegisterWebSearchProvider,
    registerInteractiveHandler:
      handlers.registerInteractiveHandler ?? noopRegisterInteractiveHandler,
    onConversationBindingResolved:
      handlers.onConversationBindingResolved ?? noopOnConversationBindingResolved,
    registerCommand: handlers.registerCommand ?? noopRegisterCommand,
    registerContextEngine: handlers.registerContextEngine ?? noopRegisterContextEngine,
    registerMemoryPromptSection:
      handlers.registerMemoryPromptSection ?? noopRegisterMemoryPromptSection,
    registerMemoryFlushPlan: handlers.registerMemoryFlushPlan ?? noopRegisterMemoryFlushPlan,
    registerMemoryRuntime: handlers.registerMemoryRuntime ?? noopRegisterMemoryRuntime,
    registerMemoryEmbeddingProvider:
      handlers.registerMemoryEmbeddingProvider ?? noopRegisterMemoryEmbeddingProvider,
    resolvePath: params.resolvePath,
    on: handlers.on ?? noopOn,
  };
}
