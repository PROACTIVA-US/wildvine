/**
 * Upstream sync command for managing changes from the upstream repository.
 *
 * Provides:
 * - Fetching upstream changes
 * - Security scanning before merge
 * - Rebrand verification
 * - Interactive merge workflow
 */

import { confirm, intro, isCancel, outro, select, spinner } from "@clack/prompts";
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { note } from "../terminal/note.js";
import { stylePromptTitle } from "../terminal/prompt-style.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";

const UPSTREAM_REMOTE = "upstream";
const UPSTREAM_URL = "https://github.com/openclaw/openclaw.git";
const DEFAULT_UPSTREAM_BRANCH = "main";

export type SyncOptions = {
  fetch?: boolean;
  status?: boolean;
  merge?: boolean;
  securityScan?: boolean;
  branch?: string;
  dryRun?: boolean;
  yes?: boolean;
};

type GitResult = {
  success: boolean;
  stdout: string;
  stderr: string;
};

function runGit(args: string[], cwd?: string): GitResult {
  try {
    const stdout = execSync(`git ${args.join(" ")}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, stdout: stdout.trim(), stderr: "" };
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string };
    return {
      success: false,
      stdout: e.stdout?.toString() || "",
      stderr: e.stderr?.toString() || "",
    };
  }
}

function ensureUpstreamRemote(): boolean {
  const remotes = runGit(["remote", "-v"]);
  if (remotes.stdout.includes(UPSTREAM_REMOTE)) {
    return true;
  }

  console.log(`${theme.muted("Adding upstream remote...")} ${UPSTREAM_URL}`);
  const result = runGit(["remote", "add", UPSTREAM_REMOTE, UPSTREAM_URL]);
  return result.success;
}

function fetchUpstream(branch: string): boolean {
  const s = spinner();
  s.start(`Fetching ${UPSTREAM_REMOTE}/${branch}...`);

  const result = runGit(["fetch", UPSTREAM_REMOTE, branch]);

  if (result.success) {
    s.stop(`Fetched ${UPSTREAM_REMOTE}/${branch}`);
    return true;
  } else {
    s.stop(`Failed to fetch: ${result.stderr}`);
    return false;
  }
}

type SyncStatus = {
  currentBranch: string;
  localCommit: string;
  upstreamCommit: string;
  commitsAhead: number;
  commitsBehind: number;
  filesChanged: number;
  recentUpstreamCommits: string[];
};

function getSyncStatus(branch: string): SyncStatus | null {
  const currentBranch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!currentBranch.success) {
    return null;
  }

  const localCommit = runGit(["rev-parse", "--short", "HEAD"]);
  const upstreamCommit = runGit(["rev-parse", "--short", `${UPSTREAM_REMOTE}/${branch}`]);

  if (!upstreamCommit.success) {
    return null;
  }

  // Count commits ahead/behind
  const aheadResult = runGit(["rev-list", "--count", `${UPSTREAM_REMOTE}/${branch}..HEAD`]);
  const behindResult = runGit(["rev-list", "--count", `HEAD..${UPSTREAM_REMOTE}/${branch}`]);

  const commitsAhead = parseInt(aheadResult.stdout, 10) || 0;
  const commitsBehind = parseInt(behindResult.stdout, 10) || 0;

  // Count files changed
  const diffStatResult = runGit(["diff", "--stat", `HEAD..${UPSTREAM_REMOTE}/${branch}`]);
  const filesChanged =
    (diffStatResult.stdout.match(/\d+ files? changed/)?.[0] || "0").replace(/\D/g, "") || "0";

  // Get recent upstream commits
  const logResult = runGit(["log", `HEAD..${UPSTREAM_REMOTE}/${branch}`, "--oneline", "-n", "10"]);
  const recentUpstreamCommits = logResult.stdout.split("\n").filter(Boolean).slice(0, 10);

  return {
    currentBranch: currentBranch.stdout,
    localCommit: localCommit.stdout,
    upstreamCommit: upstreamCommit.stdout,
    commitsAhead,
    commitsBehind,
    filesChanged: parseInt(filesChanged, 10),
    recentUpstreamCommits,
  };
}

async function runSecurityScan(ref: string): Promise<boolean> {
  const scriptPath = path.join(process.cwd(), "scripts", "security-scan.ts");

  if (!fs.existsSync(scriptPath)) {
    console.log(`${theme.warn("⚠")} Security scanner not found at ${scriptPath}`);
    return true; // Don't block if scanner missing
  }

  const s = spinner();
  s.start("Running security scan on upstream changes...");

  return new Promise((resolve) => {
    const proc = spawn("bun", [scriptPath, "--diff", ref], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: process.cwd(),
    });

    let output = "";
    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      s.stop("Security scan complete");

      // Show output
      console.log(output);

      if (code !== 0) {
        console.log(`\n${theme.error("✗")} Security scan found issues`);
        resolve(false);
      } else {
        console.log(`\n${theme.success("✓")} Security scan passed`);
        resolve(true);
      }
    });
  });
}

function printStatus(status: SyncStatus, branch: string) {
  const table = renderTable({
    columns: [
      { key: "label", header: "", align: "right" as const },
      { key: "value", header: "", align: "left" as const },
    ],
    rows: [
      { label: "Current branch", value: status.currentBranch },
      { label: "Local HEAD", value: status.localCommit },
      { label: `Upstream (${branch})`, value: status.upstreamCommit },
      { label: "Commits ahead", value: String(status.commitsAhead) },
      { label: "Commits behind", value: String(status.commitsBehind) },
      { label: "Files changed", value: String(status.filesChanged) },
    ],
  });
  console.log(table);

  if (status.recentUpstreamCommits.length > 0) {
    console.log(`\n${theme.muted("Recent upstream commits:")}`);
    for (const commit of status.recentUpstreamCommits) {
      console.log(`  ${theme.muted("•")} ${commit}`);
    }
  }
}

export async function syncCommand(runtime: RuntimeEnv = defaultRuntime, options: SyncOptions = {}) {
  intro(stylePromptTitle("Wildvine Upstream Sync") ?? "Wildvine Upstream Sync");

  const branch = options.branch || DEFAULT_UPSTREAM_BRANCH;

  // Ensure upstream remote exists
  if (!ensureUpstreamRemote()) {
    outro(`${theme.error("Failed to configure upstream remote")}`);
    process.exit(1);
  }

  // Fetch if requested or if doing merge
  if (options.fetch !== false || options.merge) {
    if (!fetchUpstream(branch)) {
      outro(`${theme.error("Failed to fetch upstream")}`);
      process.exit(1);
    }
  }

  // Get and display status
  const status = getSyncStatus(branch);
  if (!status) {
    outro(`${theme.error("Failed to get sync status")}`);
    process.exit(1);
  }

  note([`Upstream: ${UPSTREAM_URL}`, `Branch: ${branch}`].join("\n"), "Configuration");

  printStatus(status, branch);

  // If just status, we're done
  if (options.status && !options.merge) {
    if (status.commitsBehind === 0) {
      outro(`${theme.success("✓")} Already up to date with upstream`);
    } else {
      outro(`${theme.warn("⚠")} ${status.commitsBehind} commits behind upstream`);
    }
    return;
  }

  // If nothing to merge
  if (status.commitsBehind === 0) {
    outro(`${theme.success("✓")} Already up to date with upstream`);
    return;
  }

  // Security scan before merge
  if (options.securityScan !== false) {
    const scanPassed = await runSecurityScan(`${UPSTREAM_REMOTE}/${branch}`);
    if (!scanPassed && !options.yes) {
      const proceed = await confirm({
        message: "Security scan found issues. Continue anyway?",
        initialValue: false,
      });
      if (isCancel(proceed) || !proceed) {
        outro("Sync cancelled");
        return;
      }
    }
  }

  // Ask about merge strategy
  if (options.merge) {
    if (options.dryRun) {
      note(
        [
          `Would merge ${status.commitsBehind} commits from ${UPSTREAM_REMOTE}/${branch}`,
          `Files changed: ${status.filesChanged}`,
        ].join("\n"),
        "Dry run",
      );
      outro("Dry run complete (no changes made)");
      return;
    }

    const strategy = options.yes
      ? "merge"
      : await select({
          message: "How would you like to integrate upstream changes?",
          options: [
            {
              value: "merge",
              label: "Merge",
              hint: "Create a merge commit preserving history",
            },
            {
              value: "rebase",
              label: "Rebase",
              hint: "Replay local commits on top of upstream (cleaner history)",
            },
            {
              value: "cherry-pick",
              label: "Cherry-pick",
              hint: "Select specific commits to apply",
            },
            {
              value: "cancel",
              label: "Cancel",
              hint: "Don't merge now",
            },
          ],
        });

    if (isCancel(strategy) || strategy === "cancel") {
      outro("Sync cancelled");
      return;
    }

    const s = spinner();

    if (strategy === "merge") {
      s.start(`Merging ${UPSTREAM_REMOTE}/${branch}...`);
      const result = runGit(["merge", `${UPSTREAM_REMOTE}/${branch}`, "--no-edit"]);

      if (result.success) {
        s.stop(`${theme.success("✓")} Merged successfully`);
        outro("Sync complete! Run `wildvine doctor` to verify.");
      } else {
        s.stop(`${theme.error("✗")} Merge failed`);
        note(
          [
            "Merge conflicts detected. Resolve manually:",
            "  git status",
            "  # ... fix conflicts ...",
            "  git add .",
            "  git commit",
          ].join("\n"),
          "Next steps",
        );
        outro("Merge has conflicts - resolve and commit");
      }
    } else if (strategy === "rebase") {
      s.start(`Rebasing onto ${UPSTREAM_REMOTE}/${branch}...`);
      const result = runGit(["rebase", `${UPSTREAM_REMOTE}/${branch}`]);

      if (result.success) {
        s.stop(`${theme.success("✓")} Rebased successfully`);
        outro("Sync complete! Run `wildvine doctor` to verify.");
      } else {
        s.stop(`${theme.error("✗")} Rebase failed`);
        note(
          [
            "Rebase conflicts detected. Options:",
            "  git rebase --continue  # after fixing conflicts",
            "  git rebase --abort     # to cancel",
          ].join("\n"),
          "Next steps",
        );
        outro("Rebase has conflicts");
      }
    } else if (strategy === "cherry-pick") {
      s.stop("");
      note(
        [
          "Cherry-pick workflow:",
          `  git log HEAD..${UPSTREAM_REMOTE}/${branch} --oneline`,
          "  git cherry-pick <commit-hash>",
          "",
          "Or use interactive mode:",
          `  git rebase -i ${UPSTREAM_REMOTE}/${branch}`,
        ].join("\n"),
        "Cherry-pick",
      );
      outro("Use git commands to cherry-pick specific commits");
    }
  } else {
    // Default: just show status and suggest next steps
    note(
      [
        "To merge upstream changes:",
        `  wildvine sync --merge`,
        "",
        "To see the diff:",
        `  git diff HEAD..${UPSTREAM_REMOTE}/${branch} --stat`,
        "",
        "To cherry-pick specific commits:",
        `  git log HEAD..${UPSTREAM_REMOTE}/${branch} --oneline`,
        "  git cherry-pick <commit>",
      ].join("\n"),
      "Next steps",
    );
    outro(`${status.commitsBehind} commits available from upstream`);
  }
}
