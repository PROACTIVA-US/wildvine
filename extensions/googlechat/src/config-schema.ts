import {
  buildChannelConfigSchema,
  GoogleChatConfigSchema,
} from "wildvine/plugin-sdk/channel-config-schema";

export const GoogleChatChannelConfigSchema = buildChannelConfigSchema(GoogleChatConfigSchema);
