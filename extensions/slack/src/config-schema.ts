import {
  buildChannelConfigSchema,
  SlackConfigSchema,
} from "wildvine/plugin-sdk/channel-config-schema";
import { slackChannelConfigUiHints } from "./config-ui-hints.js";

export const SlackChannelConfigSchema = buildChannelConfigSchema(SlackConfigSchema, {
  uiHints: slackChannelConfigUiHints,
});
