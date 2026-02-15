import type { Command } from "commander";
import { dashboardCommand } from "../../commands/dashboard.js";
import { doctorCommand } from "../../commands/doctor.js";
import { resetCommand } from "../../commands/reset.js";
import { syncCommand } from "../../commands/sync.js";
import { uninstallCommand } from "../../commands/uninstall.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerMaintenanceCommands(program: Command) {
  program
    .command("doctor")
    .description("Health checks + quick fixes for the gateway and channels")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/doctor", "docs.wildvine.bot/cli/doctor")}\n`,
    )
    .option("--no-workspace-suggestions", "Disable workspace memory system suggestions", false)
    .option("--yes", "Accept defaults without prompting", false)
    .option("--repair", "Apply recommended repairs without prompting", false)
    .option("--fix", "Apply recommended repairs (alias for --repair)", false)
    .option("--force", "Apply aggressive repairs (overwrites custom service config)", false)
    .option("--non-interactive", "Run without prompts (safe migrations only)", false)
    .option("--generate-gateway-token", "Generate and configure a gateway token", false)
    .option("--deep", "Scan system services for extra gateway installs", false)
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await doctorCommand(defaultRuntime, {
          workspaceSuggestions: opts.workspaceSuggestions,
          yes: Boolean(opts.yes),
          repair: Boolean(opts.repair) || Boolean(opts.fix),
          force: Boolean(opts.force),
          nonInteractive: Boolean(opts.nonInteractive),
          generateGatewayToken: Boolean(opts.generateGatewayToken),
          deep: Boolean(opts.deep),
        });
      });
    });

  program
    .command("dashboard")
    .description("Open the Control UI with your current token")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/dashboard", "docs.wildvine.bot/cli/dashboard")}\n`,
    )
    .option("--no-open", "Print URL but do not launch a browser", false)
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await dashboardCommand(defaultRuntime, {
          noOpen: Boolean(opts.noOpen),
        });
      });
    });

  program
    .command("reset")
    .description("Reset local config/state (keeps the CLI installed)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/reset", "docs.wildvine.bot/cli/reset")}\n`,
    )
    .option("--scope <scope>", "config|config+creds+sessions|full (default: interactive prompt)")
    .option("--yes", "Skip confirmation prompts", false)
    .option("--non-interactive", "Disable prompts (requires --scope + --yes)", false)
    .option("--dry-run", "Print actions without removing files", false)
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await resetCommand(defaultRuntime, {
          scope: opts.scope,
          yes: Boolean(opts.yes),
          nonInteractive: Boolean(opts.nonInteractive),
          dryRun: Boolean(opts.dryRun),
        });
      });
    });

  program
    .command("uninstall")
    .description("Uninstall the gateway service + local data (CLI remains)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/uninstall", "docs.wildvine.bot/cli/uninstall")}\n`,
    )
    .option("--service", "Remove the gateway service", false)
    .option("--state", "Remove state + config", false)
    .option("--workspace", "Remove workspace dirs", false)
    .option("--app", "Remove the macOS app", false)
    .option("--all", "Remove service + state + workspace + app", false)
    .option("--yes", "Skip confirmation prompts", false)
    .option("--non-interactive", "Disable prompts (requires --yes)", false)
    .option("--dry-run", "Print actions without removing files", false)
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await uninstallCommand(defaultRuntime, {
          service: Boolean(opts.service),
          state: Boolean(opts.state),
          workspace: Boolean(opts.workspace),
          app: Boolean(opts.app),
          all: Boolean(opts.all),
          yes: Boolean(opts.yes),
          nonInteractive: Boolean(opts.nonInteractive),
          dryRun: Boolean(opts.dryRun),
        });
      });
    });

  program
    .command("sync")
    .description("Sync with upstream repository")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Examples:")}\n` +
        `  wildvine sync                    # Fetch and show status\n` +
        `  wildvine sync --merge            # Merge upstream changes\n` +
        `  wildvine sync --merge --dry-run  # Preview merge without changes\n`,
    )
    .option("--status", "Show sync status only", false)
    .option("--merge", "Merge upstream changes interactively", false)
    .option("--branch <branch>", "Upstream branch to sync from", "main")
    .option("--no-fetch", "Skip fetching upstream (use cached refs)")
    .option("--no-security-scan", "Skip security scan before merge")
    .option("--dry-run", "Preview changes without applying", false)
    .option("--yes", "Accept defaults without prompting", false)
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await syncCommand(defaultRuntime, {
          status: Boolean(opts.status),
          merge: Boolean(opts.merge),
          branch: opts.branch,
          fetch: opts.fetch,
          securityScan: opts.securityScan,
          dryRun: Boolean(opts.dryRun),
          yes: Boolean(opts.yes),
        });
      });
    });
}
