import { resolveChannelGroupRequireMention } from "wildvine/plugin-sdk/channel-policy";
import type { WildvineConfig } from "wildvine/plugin-sdk/core";

type GoogleChatGroupContext = {
  cfg: WildvineConfig;
  accountId?: string | null;
  groupId?: string | null;
};

export function resolveGoogleChatGroupRequireMention(params: GoogleChatGroupContext): boolean {
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "googlechat",
    groupId: params.groupId,
    accountId: params.accountId,
  });
}
