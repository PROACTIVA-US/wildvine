/**
 * CC Process Manager Extension
 *
 * Auto-starts CommandCentral services (hub-backend, gateway) on gateway boot.
 * Monitors health and restarts crashed processes with exponential backoff.
 *
 * Gateway RPCs: cc.process.start, cc.process.stop, cc.process.status, cc.process.restart
 * Service: cc-process-manager (lifecycle management)
 */

import type { WildvinePluginApi } from "wildvine/plugin-sdk";
import {
  CCProcessManager,
  resolveCCProjectRoot,
  resolvePythonPath,
  type ProcessManagerConfig,
} from "./process-manager.js";

type PluginConfig = {
  enabled?: boolean;
  ccProjectRoot?: string;
  pythonPath?: string;
  autoStart?: boolean;
  hubBackendPort?: number;
  gatewayPort?: number;
  hubFrontendPort?: number;
  healthCheckIntervalMs?: number;
  maxRestartAttempts?: number;
  stabilityWindowMs?: number;
};

function resolveConfig(raw: Record<string, unknown> | undefined): PluginConfig {
  const cfg = (raw ?? {}) as PluginConfig;
  return {
    enabled: cfg.enabled !== false,
    ccProjectRoot: cfg.ccProjectRoot,
    pythonPath: cfg.pythonPath,
    autoStart: cfg.autoStart !== false,
    hubBackendPort: cfg.hubBackendPort ?? 9011,
    gatewayPort: cfg.gatewayPort ?? 9000,
    hubFrontendPort: cfg.hubFrontendPort ?? 9010,
    healthCheckIntervalMs: cfg.healthCheckIntervalMs ?? 30_000,
    maxRestartAttempts: cfg.maxRestartAttempts ?? 5,
    stabilityWindowMs: cfg.stabilityWindowMs ?? 300_000, // 5 minutes
  };
}

export default {
  id: "cc-process-manager",
  name: "CC Process Manager",
  description: "Auto-starts and manages CommandCentral backend services on gateway boot",

  register(api: WildvinePluginApi) {
    const pluginCfg = resolveConfig(api.pluginConfig);

    if (!pluginCfg.enabled) {
      api.logger.info("cc-process-manager: disabled in config");
      return;
    }

    const ccProjectRoot = resolveCCProjectRoot(pluginCfg.ccProjectRoot);
    const pythonPath = resolvePythonPath(ccProjectRoot, pluginCfg.pythonPath);

    const managerConfig: ProcessManagerConfig = {
      ccProjectRoot,
      pythonPath,
      hubBackendPort: pluginCfg.hubBackendPort!,
      gatewayPort: pluginCfg.gatewayPort!,
      hubFrontendPort: pluginCfg.hubFrontendPort!,
      healthCheckIntervalMs: pluginCfg.healthCheckIntervalMs!,
      maxRestartAttempts: pluginCfg.maxRestartAttempts!,
      stabilityWindowMs: pluginCfg.stabilityWindowMs!,
    };

    const manager = new CCProcessManager(managerConfig, api.logger);

    // ── Gateway RPC: cc.process.start ─────────────────────────

    api.registerGatewayMethod("cc.process.start", async ({ respond }) => {
      try {
        await manager.startAll();
        respond(true, { message: "CC services started", status: manager.getStatus() });
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : "Failed to start CC" });
      }
    });

    // ── Gateway RPC: cc.process.stop ──────────────────────────

    api.registerGatewayMethod("cc.process.stop", async ({ respond }) => {
      try {
        await manager.stopAll();
        respond(true, { message: "CC services stopped", status: manager.getStatus() });
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : "Failed to stop CC" });
      }
    });

    // ── Gateway RPC: cc.process.status ────────────────────────

    api.registerGatewayMethod("cc.process.status", async ({ respond }) => {
      const status = manager.getStatus();
      const allRunning = Object.values(status).every((s) => s.running);
      const anyRunning = Object.values(status).some((s) => s.running);
      respond(true, {
        overall: allRunning ? "running" : anyRunning ? "partial" : "stopped",
        services: status,
        config: {
          ccProjectRoot,
          pythonPath,
          hubBackendPort: managerConfig.hubBackendPort,
          gatewayPort: managerConfig.gatewayPort,
        },
      });
    });

    // ── Gateway RPC: cc.process.restart ───────────────────────

    api.registerGatewayMethod("cc.process.restart", async ({ respond }) => {
      try {
        await manager.restartAll();
        respond(true, { message: "CC services restarted", status: manager.getStatus() });
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : "Failed to restart CC" });
      }
    });

    // ── Service lifecycle ─────────────────────────────────────

    api.registerService({
      id: "cc-process-manager",
      start: async () => {
        if (!pluginCfg.autoStart) {
          api.logger.info("cc-process-manager: autoStart disabled, skipping");
          return;
        }
        api.logger.info(
          `cc-process-manager: auto-starting CC services (root: ${ccProjectRoot}, python: ${pythonPath})`,
        );
        try {
          await manager.startAll();
          api.logger.info("cc-process-manager: CC services started successfully");
        } catch (err) {
          api.logger.warn(
            `cc-process-manager: failed to auto-start CC: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
      stop: async () => {
        api.logger.info("cc-process-manager: stopping CC services");
        try {
          await manager.stopAll();
        } catch (err) {
          api.logger.warn(
            `cc-process-manager: error stopping CC: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
    });

    api.logger.info(
      `cc-process-manager: registered (root: ${ccProjectRoot}, python: ${pythonPath}, autoStart: ${pluginCfg.autoStart})`,
    );
  },
};
