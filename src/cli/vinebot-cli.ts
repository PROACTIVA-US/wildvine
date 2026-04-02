import type { Command } from "commander";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { registerQrCli } from "./qr-cli.js";

export function registerClawbotCli(program: Command) {
  const vinebot = program
    .command("vinebot")
    .description("Legacy vinebot command aliases")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/vinebot", "docs.wildvine.com/cli/vinebot")}\n`,
    );
  registerQrCli(vinebot);
}
