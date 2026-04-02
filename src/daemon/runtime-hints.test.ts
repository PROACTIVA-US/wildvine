import { describe, expect, it } from "vitest";
import { buildPlatformRuntimeLogHints, buildPlatformServiceStartHints } from "./runtime-hints.js";

describe("buildPlatformRuntimeLogHints", () => {
  it("renders launchd log hints on darwin", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        env: {
          WILDVINE_STATE_DIR: "/tmp/wildvine-state",
          WILDVINE_LOG_PREFIX: "gateway",
        },
        systemdServiceName: "wildvine-gateway",
        windowsTaskName: "Wildvine Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /tmp/wildvine-state/logs/gateway.log",
      "Launchd stderr (if installed): /tmp/wildvine-state/logs/gateway.err.log",
    ]);
  });

  it("renders systemd and windows hints by platform", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "linux",
        systemdServiceName: "wildvine-gateway",
        windowsTaskName: "Wildvine Gateway",
      }),
    ).toEqual(["Logs: journalctl --user -u wildvine-gateway.service -n 200 --no-pager"]);
    expect(
      buildPlatformRuntimeLogHints({
        platform: "win32",
        systemdServiceName: "wildvine-gateway",
        windowsTaskName: "Wildvine Gateway",
      }),
    ).toEqual(['Logs: schtasks /Query /TN "Wildvine Gateway" /V /FO LIST']);
  });
});

describe("buildPlatformServiceStartHints", () => {
  it("builds platform-specific service start hints", () => {
    expect(
      buildPlatformServiceStartHints({
        platform: "darwin",
        installCommand: "wildvine gateway install",
        startCommand: "wildvine gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.wildvine.gateway.plist",
        systemdServiceName: "wildvine-gateway",
        windowsTaskName: "Wildvine Gateway",
      }),
    ).toEqual([
      "wildvine gateway install",
      "wildvine gateway",
      "launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.wildvine.gateway.plist",
    ]);
    expect(
      buildPlatformServiceStartHints({
        platform: "linux",
        installCommand: "wildvine gateway install",
        startCommand: "wildvine gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.wildvine.gateway.plist",
        systemdServiceName: "wildvine-gateway",
        windowsTaskName: "Wildvine Gateway",
      }),
    ).toEqual([
      "wildvine gateway install",
      "wildvine gateway",
      "systemctl --user start wildvine-gateway.service",
    ]);
  });
});
