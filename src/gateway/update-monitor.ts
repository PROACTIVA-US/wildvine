import { checkGitUpdateStatus, type GitUpdateStatus } from "../infra/update-check.js";
import { resolveWildvinePackageRoot } from "../infra/wildvine-root.js";

export type UpdateMonitorResult = {
  git: GitUpdateStatus;
  lastCheckedAt: string;
};

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export class UpdateMonitor {
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastResult: UpdateMonitorResult | null = null;
  private lastBehind: number | null = null;
  private readonly broadcast: (
    event: string,
    payload: unknown,
    opts?: { dropIfSlow?: boolean },
  ) => void;

  constructor(
    broadcast: (event: string, payload: unknown, opts?: { dropIfSlow?: boolean }) => void,
  ) {
    this.broadcast = broadcast;
  }

  async start(): Promise<void> {
    await this.check();
    this.interval = setInterval(() => {
      void this.check();
    }, CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getLastResult(): UpdateMonitorResult | null {
    return this.lastResult;
  }

  private async check(): Promise<void> {
    try {
      const root = await resolveWildvinePackageRoot({
        moduleUrl: import.meta.url,
        argv1: process.argv[1],
        cwd: process.cwd(),
      });
      if (!root) {
        return;
      }

      const git = await checkGitUpdateStatus({ root, fetch: true, timeoutMs: 10000 });
      const result: UpdateMonitorResult = {
        git,
        lastCheckedAt: new Date().toISOString(),
      };
      this.lastResult = result;

      const behind = git.behind ?? 0;
      if (behind > 0 && behind !== this.lastBehind) {
        this.broadcast(
          "update",
          {
            available: true,
            behind,
            branch: git.branch,
            sha: git.sha,
          },
          { dropIfSlow: true },
        );
      }
      this.lastBehind = behind;
    } catch {
      // Best-effort; don't crash the gateway.
    }
  }
}
