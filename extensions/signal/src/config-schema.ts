import {
  buildChannelConfigSchema,
  SignalConfigSchema,
} from "wildvine/plugin-sdk/channel-config-schema";
import { signalChannelConfigUiHints } from "./config-ui-hints.js";

export const SignalChannelConfigSchema = buildChannelConfigSchema(SignalConfigSchema, {
  uiHints: signalChannelConfigUiHints,
});
