import {
  buildChannelConfigSchema,
  IMessageConfigSchema,
} from "wildvine/plugin-sdk/channel-config-schema";
import { iMessageChannelConfigUiHints } from "./config-ui-hints.js";

export const IMessageChannelConfigSchema = buildChannelConfigSchema(IMessageConfigSchema, {
  uiHints: iMessageChannelConfigUiHints,
});
