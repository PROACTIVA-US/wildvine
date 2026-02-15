import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "wildvine", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "wildvine", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "wildvine", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "wildvine", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "wildvine", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "wildvine", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "wildvine", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "wildvine"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "wildvine", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "wildvine", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "wildvine", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "wildvine", "status", "--timeout=2500"], "--timeout")).toBe(
      "2500",
    );
    expect(getFlagValue(["node", "wildvine", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "wildvine", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "wildvine", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "wildvine", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "wildvine", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "wildvine", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "wildvine", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "wildvine", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "wildvine", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "wildvine", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "wildvine",
      rawArgs: ["node", "wildvine", "status"],
    });
    expect(nodeArgv).toEqual(["node", "wildvine", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "wildvine",
      rawArgs: ["node-22", "wildvine", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "wildvine", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "wildvine",
      rawArgs: ["node-22.2.0.exe", "wildvine", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "wildvine", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "wildvine",
      rawArgs: ["node-22.2", "wildvine", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "wildvine", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "wildvine",
      rawArgs: ["node-22.2.exe", "wildvine", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "wildvine", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "wildvine",
      rawArgs: ["/usr/bin/node-22.2.0", "wildvine", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "wildvine", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "wildvine",
      rawArgs: ["nodejs", "wildvine", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "wildvine", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "wildvine",
      rawArgs: ["node-dev", "wildvine", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "wildvine", "node-dev", "wildvine", "status"]);

    const directArgv = buildParseArgv({
      programName: "wildvine",
      rawArgs: ["wildvine", "status"],
    });
    expect(directArgv).toEqual(["node", "wildvine", "status"]);

    const bunArgv = buildParseArgv({
      programName: "wildvine",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "wildvine",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "wildvine", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "wildvine", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "wildvine", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "wildvine", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "wildvine", "config", "get", "update"])).toBe(false);
    expect(shouldMigrateState(["node", "wildvine", "config", "unset", "update"])).toBe(false);
    expect(shouldMigrateState(["node", "wildvine", "models", "list"])).toBe(false);
    expect(shouldMigrateState(["node", "wildvine", "models", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "wildvine", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "wildvine", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "wildvine", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "wildvine", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["config", "get"])).toBe(false);
    expect(shouldMigrateStateFromPath(["models", "status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
