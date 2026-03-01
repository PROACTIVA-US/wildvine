/**
 * CC Process Manager — spawns and monitors CC hub-backend + gateway
 * as child processes with health polling and auto-restart.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";

export type ServiceId = "hub-backend" | "gateway" | "hub-frontend";

export type ServiceStatus = {
  id: ServiceId;
  running: boolean;
  pid: number | null;
  port: number;
  uptimeMs: number | null;
  restartCount: number;
  lastHealthCheck: number | null;
  healthy: boolean;
};

export type ProcessManagerConfig = {
  ccProjectRoot: string;
  pythonPath: string;
  hubBackendPort: number;
  gatewayPort: number;
  hubFrontendPort: number;
  healthCheckIntervalMs: number;
  maxRestartAttempts: number;
  /** Seconds a service must run without crashing to reset its restart counter */
  stabilityWindowMs: number;
};

type ManagedService = {
  id: ServiceId;
  process: ChildProcess | null;
  port: number;
  startedAt: number | null;
  restartCount: number;
  lastHealthCheck: number | null;
  healthy: boolean;
  module: string;
  cwd: string;
  /** "python" for uvicorn services, "node" for pnpm/node services */
  runtime: "python" | "node";
  stabilityTimer: ReturnType<typeof setTimeout> | null;
};

export class CCProcessManager {
  private services = new Map<ServiceId, ManagedService>();
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private config: ProcessManagerConfig;
  private logger: { info: (msg: string) => void; warn: (msg: string) => void };
  private stopping = false;

  constructor(
    config: ProcessManagerConfig,
    logger: { info: (msg: string) => void; warn: (msg: string) => void },
  ) {
    this.config = config;
    this.logger = logger;

    this.services.set("hub-backend", {
      id: "hub-backend",
      process: null,
      port: config.hubBackendPort,
      startedAt: null,
      restartCount: 0,
      lastHealthCheck: null,
      healthy: false,
      module: "app:app",
      cwd: join(config.ccProjectRoot, "hub-backend"),
      runtime: "python",
      stabilityTimer: null,
    });

    this.services.set("gateway", {
      id: "gateway",
      process: null,
      port: config.gatewayPort,
      startedAt: null,
      restartCount: 0,
      lastHealthCheck: null,
      healthy: false,
      module: "app:app",
      cwd: join(config.ccProjectRoot, "gateway"),
      runtime: "python",
      stabilityTimer: null,
    });

    this.services.set("hub-frontend", {
      id: "hub-frontend",
      process: null,
      port: config.hubFrontendPort,
      startedAt: null,
      restartCount: 0,
      lastHealthCheck: null,
      healthy: false,
      module: "",
      cwd: join(config.ccProjectRoot, "hub-frontend"),
      runtime: "node",
      stabilityTimer: null,
    });
  }

  /** Return the correct health URL for each service */
  private healthUrl(svc: ManagedService): string {
    switch (svc.id) {
      case "gateway":
        return `http://localhost:${svc.port}/health`;
      case "hub-backend":
        return `http://localhost:${svc.port}/api/health`;
      case "hub-frontend":
        return `http://localhost:${svc.port}/`;
      default:
        return `http://localhost:${svc.port}/api/health`;
    }
  }

  async startAll(): Promise<void> {
    this.stopping = false;

    // Start hub-backend first — gateway depends on it
    await this.startService("hub-backend");
    await this.waitForHealth("hub-backend", 15_000);

    // Start gateway
    await this.startService("gateway");
    await this.waitForHealth("gateway", 10_000);

    // Start hub-frontend
    const frontendDir = join(this.config.ccProjectRoot, "hub-frontend");
    if (existsSync(join(frontendDir, "package.json"))) {
      await this.startService("hub-frontend");
    }

    // Start health monitoring
    this.startHealthMonitor();
  }

  async stopAll(): Promise<void> {
    this.stopping = true;
    this.stopHealthMonitor();

    // Stop in reverse start order
    await this.stopService("hub-frontend");
    await this.stopService("gateway");
    await this.stopService("hub-backend");
  }

  async restartAll(): Promise<void> {
    await this.stopAll();
    await this.startAll();
  }

  getStatus(): Record<ServiceId, ServiceStatus> {
    const result = {} as Record<ServiceId, ServiceStatus>;
    for (const [id, svc] of this.services) {
      result[id] = {
        id,
        running: svc.process !== null && svc.process.exitCode === null,
        pid: svc.process?.pid ?? null,
        port: svc.port,
        uptimeMs: svc.startedAt ? Date.now() - svc.startedAt : null,
        restartCount: svc.restartCount,
        lastHealthCheck: svc.lastHealthCheck,
        healthy: svc.healthy,
      };
    }
    return result;
  }

  private async startService(id: ServiceId): Promise<void> {
    const svc = this.services.get(id);
    if (!svc) return;

    // Kill existing process if any
    if (svc.process && svc.process.exitCode === null) {
      svc.process.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Clear any existing stability timer
    if (svc.stabilityTimer) {
      clearTimeout(svc.stabilityTimer);
      svc.stabilityTimer = null;
    }

    if (!existsSync(svc.cwd)) {
      this.logger.warn(`cc-process-manager: ${id} directory not found at ${svc.cwd}`);
      return;
    }

    let child: ChildProcess;

    if (svc.runtime === "node") {
      // Node/pnpm service (hub-frontend)
      const args = ["dev", "--port", String(svc.port)];
      this.logger.info(
        `cc-process-manager: starting ${id} — pnpm ${args.join(" ")} (cwd: ${svc.cwd})`,
      );
      child = spawn("pnpm", args, {
        cwd: svc.cwd,
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } else {
      // Python/uvicorn service
      const pythonPath = this.config.pythonPath;
      const args = ["-m", "uvicorn", svc.module, "--port", String(svc.port)];
      this.logger.info(
        `cc-process-manager: starting ${id} — ${pythonPath} ${args.join(" ")} (cwd: ${svc.cwd})`,
      );
      child = spawn(pythonPath, args, {
        cwd: svc.cwd,
        env: {
          ...process.env,
          PYTHONPATH: svc.cwd,
          PYTHONUNBUFFERED: "1",
          ALLOWED_API_KEYS: process.env.ALLOWED_API_KEYS ?? "cc-wildvine-local",
          AUTH_ENABLED: process.env.AUTH_ENABLED ?? "true",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
    }

    svc.process = child;
    svc.startedAt = Date.now();
    svc.healthy = false;

    // Start stability timer — reset restartCount after stabilityWindowMs of uptime
    svc.stabilityTimer = setTimeout(() => {
      if (svc.process && svc.process.exitCode === null && svc.restartCount > 0) {
        this.logger.info(
          `cc-process-manager: ${id} stable for ${this.config.stabilityWindowMs / 1000}s, resetting restart counter`,
        );
        svc.restartCount = 0;
      }
      svc.stabilityTimer = null;
    }, this.config.stabilityWindowMs);

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString().trim();
      if (text) this.logger.info(`cc:${id}: ${text}`);
    });

    child.stderr?.on("data", (data: Buffer) => {
      const text = data.toString().trim();
      if (text) this.logger.info(`cc:${id}:err: ${text}`);
    });

    child.on("exit", (code, signal) => {
      this.logger.info(`cc-process-manager: ${id} exited (code=${code}, signal=${signal})`);
      svc.healthy = false;

      // Clear stability timer on exit
      if (svc.stabilityTimer) {
        clearTimeout(svc.stabilityTimer);
        svc.stabilityTimer = null;
      }

      // Auto-restart if not stopping intentionally
      if (!this.stopping && svc.restartCount < this.config.maxRestartAttempts) {
        const delay = Math.min(1000 * 2 ** svc.restartCount, 30_000);
        svc.restartCount++;
        this.logger.info(
          `cc-process-manager: restarting ${id} in ${delay}ms (attempt ${svc.restartCount}/${this.config.maxRestartAttempts})`,
        );
        setTimeout(() => {
          if (!this.stopping) {
            void this.startService(id);
          }
        }, delay);
      }
    });
  }

  private async stopService(id: ServiceId): Promise<void> {
    const svc = this.services.get(id);
    if (!svc?.process || svc.process.exitCode !== null) return;

    // Clear stability timer
    if (svc.stabilityTimer) {
      clearTimeout(svc.stabilityTimer);
      svc.stabilityTimer = null;
    }

    this.logger.info(`cc-process-manager: stopping ${id} (PID ${svc.process.pid})`);

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (svc.process && svc.process.exitCode === null) {
          svc.process.kill("SIGKILL");
        }
        resolve();
      }, 5000);

      svc.process!.once("exit", () => {
        clearTimeout(timeout);
        svc.process = null;
        svc.healthy = false;
        svc.startedAt = null;
        resolve();
      });

      svc.process!.kill("SIGTERM");
    });
  }

  private async waitForHealth(id: ServiceId, timeoutMs: number): Promise<boolean> {
    const svc = this.services.get(id);
    if (!svc) return false;

    const url = this.healthUrl(svc);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) {
          svc.healthy = true;
          svc.lastHealthCheck = Date.now();
          return true;
        }
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    return false;
  }

  private startHealthMonitor(): void {
    this.stopHealthMonitor();
    this.healthInterval = setInterval(
      () => void this.checkHealth(),
      this.config.healthCheckIntervalMs,
    );
  }

  private stopHealthMonitor(): void {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }

  private async checkHealth(): Promise<void> {
    for (const [, svc] of this.services) {
      if (!svc.process || svc.process.exitCode !== null) {
        svc.healthy = false;
        continue;
      }

      try {
        const res = await fetch(this.healthUrl(svc), {
          signal: AbortSignal.timeout(3000),
        });
        svc.healthy = res.ok;
        svc.lastHealthCheck = Date.now();
      } catch {
        svc.healthy = false;
      }
    }
  }
}

/**
 * Resolve the Python interpreter path using a fallback chain:
 * 1. CC_PYTHON_PATH env var
 * 2. Plugin config pythonPath
 * 3. Auto-detect .venv/bin/python in CC project root
 * 4. Auto-detect venv/bin/python in CC project root
 * 5. System python3
 */
export function resolvePythonPath(ccProjectRoot: string, configPythonPath?: string): string {
  // 1. Env var
  if (process.env.CC_PYTHON_PATH && existsSync(process.env.CC_PYTHON_PATH)) {
    return process.env.CC_PYTHON_PATH;
  }

  // 2. Plugin config
  if (configPythonPath && existsSync(configPythonPath)) {
    return configPythonPath;
  }

  // 3. .venv in project root
  const dotVenv = join(ccProjectRoot, ".venv", "bin", "python");
  if (existsSync(dotVenv)) {
    return dotVenv;
  }

  // 4. venv in project root
  const venv = join(ccProjectRoot, "venv", "bin", "python");
  if (existsSync(venv)) {
    return venv;
  }

  // 5. System python3
  return "python3";
}

/**
 * Resolve the CC project root directory.
 * Fallback chain: env var → plugin config → sibling directory
 */
export function resolveCCProjectRoot(configRoot?: string): string {
  // 1. Env var
  if (process.env.CC_PROJECT_ROOT) {
    const envRoot = resolve(process.env.CC_PROJECT_ROOT);
    if (existsSync(envRoot)) return envRoot;
  }

  // 2. Plugin config
  if (configRoot) {
    const configResolved = resolve(configRoot);
    if (existsSync(configResolved)) return configResolved;
  }

  // 3. Sibling directory (wildvine is at ../wildvine, CC at ../commandcentralV.0)
  const sibling = resolve(__dirname, "..", "..", "..", "commandcentralV.0");
  if (existsSync(sibling)) return sibling;

  // 4. Absolute fallback
  return resolve(process.env.HOME ?? "/tmp", "Projects", "commandcentralV.0");
}
