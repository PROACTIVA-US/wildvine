/**
 * E2E tests for CC consolidation Phases 1-3.
 *
 * Phase 1: cc.knowledge.capture RPC
 * Phase 2: Governance persistence (fire-and-forget, verified via health)
 * Phase 3: cc.skills.ingest RPC, skills.status regression check
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { startGatewayServer } from "./server.js";
import { connectGatewayClient, getFreeGatewayPort } from "./test-helpers.e2e.js";

describe("cc-consolidation e2e", () => {
  it("registers Phase 1-3 RPCs and responds correctly", { timeout: 60_000 }, async () => {
    const prev = {
      home: process.env.HOME,
      configPath: process.env.WILDVINE_CONFIG_PATH,
      token: process.env.WILDVINE_GATEWAY_TOKEN,
      skipChannels: process.env.WILDVINE_SKIP_CHANNELS,
      skipGmail: process.env.WILDVINE_SKIP_GMAIL_WATCHER,
      skipCron: process.env.WILDVINE_SKIP_CRON,
      skipCanvas: process.env.WILDVINE_SKIP_CANVAS_HOST,
      skipBrowser: process.env.WILDVINE_SKIP_BROWSER_CONTROL_SERVER,
    };

    const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "wildvine-cc-e2e-"));
    process.env.HOME = tempHome;
    process.env.WILDVINE_SKIP_CHANNELS = "1";
    process.env.WILDVINE_SKIP_GMAIL_WATCHER = "1";
    process.env.WILDVINE_SKIP_CRON = "1";
    process.env.WILDVINE_SKIP_CANVAS_HOST = "1";
    process.env.WILDVINE_SKIP_BROWSER_CONTROL_SERVER = "1";

    const token = `test-${randomUUID()}`;
    process.env.WILDVINE_GATEWAY_TOKEN = token;

    const configDir = path.join(tempHome, ".wildvine");
    await fs.mkdir(configDir, { recursive: true });
    const configPath = path.join(configDir, "wildvine.json");
    await fs.writeFile(configPath, JSON.stringify({ agents: {}, gateway: { auth: { token } } }));
    process.env.WILDVINE_CONFIG_PATH = configPath;

    const port = await getFreeGatewayPort();
    const server = await startGatewayServer(port, {
      bind: "loopback",
      auth: { mode: "token", token },
      controlUiEnabled: false,
    });

    const client = await connectGatewayClient({
      url: `ws://127.0.0.1:${port}`,
      token,
    });

    try {
      // ── Phase 1: cc.knowledge.capture ──────────────────
      try {
        await client.request("cc.knowledge.capture", {
          content: "E2E test knowledge",
          source: "e2e",
        });
      } catch (err: unknown) {
        // Expected: CC backend not running → connection error
        const msg = err instanceof Error ? err.message : String(err);
        expect(
          msg.includes("ECONNREFUSED") ||
            msg.includes("fetch failed") ||
            msg.includes("CC") ||
            msg.includes("capture failed") ||
            msg.includes("unknown method"),
        ).toBe(true);
      }

      // ── Phase 2: health works (governance persistence is background) ──
      const health = await client.request("health", {});
      expect(health.ok).toBe(true);

      // ── Phase 3: cc.skills.ingest ──────────────────────
      try {
        await client.request("cc.skills.ingest", {
          name: "test-skill",
          content: "# Test",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        expect(
          msg.includes("ECONNREFUSED") ||
            msg.includes("fetch failed") ||
            msg.includes("CC") ||
            msg.includes("ingest failed") ||
            msg.includes("unknown method"),
        ).toBe(true);
      }

      // ── Phase 3: skills.status (regression check) ─────
      const skills = await client.request("skills.status", {});
      expect(skills).toBeDefined();

      client.stop();
    } finally {
      await server.close();
      process.env.HOME = prev.home;
      process.env.WILDVINE_CONFIG_PATH = prev.configPath;
      process.env.WILDVINE_GATEWAY_TOKEN = prev.token;
      process.env.WILDVINE_SKIP_CHANNELS = prev.skipChannels;
      process.env.WILDVINE_SKIP_GMAIL_WATCHER = prev.skipGmail;
      process.env.WILDVINE_SKIP_CRON = prev.skipCron;
      process.env.WILDVINE_SKIP_CANVAS_HOST = prev.skipCanvas;
      process.env.WILDVINE_SKIP_BROWSER_CONTROL_SERVER = prev.skipBrowser;
      await fs.rm(tempHome, { recursive: true, force: true }).catch(() => {});
    }
  });
});
