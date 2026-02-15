import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#wildvine",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#wildvine",
      rawTarget: "#wildvine",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "wildvine-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "wildvine-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "wildvine-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "wildvine-bot",
      rawTarget: "wildvine-bot",
    });
  });
});
