#!/usr/bin/env bun
/**
 * Security scanner for wildvine extensions, skills, and upstream changes.
 *
 * Checks for:
 * - Prompt injection vulnerabilities
 * - Hardcoded secrets/credentials
 * - Rebrand issues (old branding references)
 * - Dangerous code patterns (eval, exec, etc.)
 * - Supply chain risks (new dependencies)
 *
 * Usage:
 *   bun scripts/security-scan.ts [--extensions] [--diff <ref>] [--verbose]
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

type Finding = {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  file: string;
  line?: number;
  message: string;
  snippet?: string;
};

const findings: Finding[] = [];

// Patterns to detect
const PATTERNS = {
  // Prompt injection risks
  promptInjection: [
    { pattern: /system.*prompt.*\+.*user/gi, desc: "User input concatenated to system prompt" },
    { pattern: /`\$\{.*message.*\}`/g, desc: "Template literal with message content" },
    { pattern: /eval\s*\(\s*.*(?:input|message|content)/gi, desc: "Eval with user input" },
    { pattern: /new\s+Function\s*\(/g, desc: "Dynamic function construction" },
    { pattern: /(?:system|assistant).*role.*:\s*`/g, desc: "Dynamic role content" },
  ],

  // Hardcoded secrets
  secrets: [
    { pattern: /['"]sk-[a-zA-Z0-9]{20,}['"]/g, desc: "OpenAI API key" },
    { pattern: /['"]ghp_[a-zA-Z0-9]{36}['"]/g, desc: "GitHub personal access token" },
    { pattern: /['"]xox[baprs]-[a-zA-Z0-9-]{10,}['"]/g, desc: "Slack token" },
    { pattern: /ANTHROPIC_API_KEY\s*=\s*['"][^'"]+['"]/g, desc: "Anthropic API key assignment" },
    { pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/gi, desc: "Hardcoded password" },
    { pattern: /['"][a-zA-Z0-9+/]{40,}={0,2}['"]/g, desc: "Possible base64 encoded secret" },
    { pattern: /bearer\s+[a-zA-Z0-9._-]{20,}/gi, desc: "Bearer token" },
  ],

  // Old branding (openclaw references that should be wildvine)
  rebrand: [
    { pattern: /openclaw(?!\/openclaw)/gi, desc: "openclaw reference (should be wildvine?)" },
    { pattern: /open-claw/gi, desc: "open-claw reference" },
    { pattern: /OpenClaw/g, desc: "OpenClaw reference" },
    { pattern: /@openclaw\//g, desc: "@openclaw/ package reference" },
  ],

  // Dangerous code patterns
  dangerous: [
    { pattern: /eval\s*\(/g, desc: "eval() usage" },
    { pattern: /child_process.*exec(?!Sync)/g, desc: "Async exec (command injection risk)" },
    { pattern: /\$\(.*\)/g, desc: "Shell command substitution in string" },
    { pattern: /vm\.run(?:InContext|InThisContext)?\s*\(/g, desc: "VM code execution" },
    { pattern: /require\s*\(\s*[^'"]/g, desc: "Dynamic require" },
    { pattern: /import\s*\(\s*[^'"]/g, desc: "Dynamic import" },
    { pattern: /\.innerHTML\s*=/g, desc: "innerHTML assignment (XSS risk)" },
    { pattern: /document\.write\s*\(/g, desc: "document.write (XSS risk)" },
    { pattern: /dangerouslySetInnerHTML/g, desc: "React dangerouslySetInnerHTML" },
    { pattern: /unsafeWindow/g, desc: "unsafeWindow access" },
    { pattern: /Function\s*\(\s*['"`]return/g, desc: "Function constructor" },
  ],

  // Supply chain / dependency risks
  dependencies: [
    { pattern: /"(?:pre|post)install"\s*:/g, desc: "Install script hook" },
    { pattern: /curl.*\|\s*(?:bash|sh)/g, desc: "Pipe to shell pattern" },
    { pattern: /wget.*\|\s*(?:bash|sh)/g, desc: "Wget pipe to shell" },
  ],
};

function severityColor(severity: Finding["severity"]): string {
  switch (severity) {
    case "critical":
      return COLORS.red;
    case "high":
      return COLORS.red;
    case "medium":
      return COLORS.yellow;
    case "low":
      return COLORS.cyan;
    default:
      return COLORS.dim;
  }
}

function addFinding(finding: Finding) {
  findings.push(finding);
}

function scanFile(filePath: string, content: string) {
  const lines = content.split("\n");

  // Skip binary files, minified files, lock files
  if (
    filePath.endsWith(".lock") ||
    filePath.endsWith("-lock.yaml") ||
    filePath.endsWith(".min.js") ||
    filePath.includes("node_modules") ||
    filePath.includes(".git/")
  ) {
    return;
  }

  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const { pattern, desc } of patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;

      while ((match = regex.exec(content)) !== null) {
        // Find line number
        const beforeMatch = content.slice(0, match.index);
        const lineNum = beforeMatch.split("\n").length;
        const lineContent = lines[lineNum - 1]?.trim() || "";

        // Determine severity based on category
        let severity: Finding["severity"] = "medium";
        if (category === "secrets") {
          severity = "critical";
        } else if (category === "promptInjection") {
          severity = "high";
        } else if (category === "dangerous") {
          severity = "high";
        } else if (category === "rebrand") {
          severity = "low";
        } else if (category === "dependencies") {
          severity = "medium";
        }

        // Skip false positives
        if (
          category === "rebrand" &&
          (filePath.includes("security-scan") ||
            filePath.includes("CHANGELOG") ||
            lineContent.includes("upstream") ||
            lineContent.includes("github.com/openclaw"))
        ) {
          continue;
        }

        // Skip test files for some patterns
        if (filePath.includes(".test.") && category === "dangerous") {
          severity = "info";
        }

        addFinding({
          severity,
          category,
          file: filePath,
          line: lineNum,
          message: desc,
          snippet: lineContent.slice(0, 100),
        });
      }
    }
  }
}

function scanDirectory(dir: string, extensions = [".ts", ".js", ".tsx", ".jsx", ".json", ".md"]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
        continue;
      }
      scanDirectory(fullPath, extensions);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext) || entry.name === "package.json") {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          scanFile(fullPath, content);
        } catch {
          // Skip unreadable files
        }
      }
    }
  }
}

function scanGitDiff(ref: string) {
  console.log(`${COLORS.cyan}Scanning diff against ${ref}...${COLORS.reset}\n`);

  try {
    // Get list of changed files
    const diffFiles = execSync(`git diff --name-only ${ref}`, { encoding: "utf-8" })
      .trim()
      .split("\n")
      .filter(Boolean);

    console.log(`Found ${diffFiles.length} changed files\n`);

    for (const file of diffFiles) {
      if (!fs.existsSync(file)) {
        continue;
      }

      try {
        const content = fs.readFileSync(file, "utf-8");
        scanFile(file, content);
      } catch {
        // Skip unreadable files
      }
    }

    // Also check for new dependencies
    if (diffFiles.includes("package.json")) {
      console.log(
        `${COLORS.yellow}⚠ package.json changed - review dependency changes${COLORS.reset}`,
      );

      try {
        const diff = execSync(`git diff ${ref} -- package.json`, { encoding: "utf-8" });
        const addedDeps = diff.match(/^\+\s*"[^"]+"\s*:\s*"[^"]+"/gm) || [];
        if (addedDeps.length > 0) {
          console.log(`\nNew dependencies added:`);
          for (const dep of addedDeps) {
            console.log(`  ${dep.trim()}`);
          }
          console.log();
        }
      } catch {
        // Ignore diff errors
      }
    }
  } catch (error) {
    console.error(`${COLORS.red}Error scanning diff: ${error}${COLORS.reset}`);
    process.exit(1);
  }
}

function printReport() {
  console.log("\n" + "=".repeat(80));
  console.log("SECURITY SCAN REPORT");
  console.log("=".repeat(80) + "\n");

  if (findings.length === 0) {
    console.log(`${COLORS.green}✓ No security issues found${COLORS.reset}\n`);
    return;
  }

  // Group by severity
  const bySeverity = {
    critical: findings.filter((f) => f.severity === "critical"),
    high: findings.filter((f) => f.severity === "high"),
    medium: findings.filter((f) => f.severity === "medium"),
    low: findings.filter((f) => f.severity === "low"),
    info: findings.filter((f) => f.severity === "info"),
  };

  // Summary
  console.log("Summary:");
  console.log(`  ${COLORS.red}Critical: ${bySeverity.critical.length}${COLORS.reset}`);
  console.log(`  ${COLORS.red}High: ${bySeverity.high.length}${COLORS.reset}`);
  console.log(`  ${COLORS.yellow}Medium: ${bySeverity.medium.length}${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}Low: ${bySeverity.low.length}${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Info: ${bySeverity.info.length}${COLORS.reset}`);
  console.log();

  // Details
  for (const [severity, items] of Object.entries(bySeverity)) {
    if (items.length === 0) {
      continue;
    }

    console.log(
      `\n${severityColor(severity as Finding["severity"])}${severity.toUpperCase()} (${items.length})${COLORS.reset}`,
    );
    console.log("-".repeat(40));

    // Group by category
    const byCategory = new Map<string, Finding[]>();
    for (const item of items) {
      const existing = byCategory.get(item.category) || [];
      existing.push(item);
      byCategory.set(item.category, existing);
    }

    for (const [category, catItems] of byCategory) {
      console.log(`\n  ${category}:`);
      for (const item of catItems.slice(0, 10)) {
        console.log(`    ${item.file}:${item.line || "?"}`);
        console.log(`      ${COLORS.dim}${item.message}${COLORS.reset}`);
        if (item.snippet) {
          console.log(`      ${COLORS.dim}→ ${item.snippet.slice(0, 60)}...${COLORS.reset}`);
        }
      }
      if (catItems.length > 10) {
        console.log(`    ${COLORS.dim}... and ${catItems.length - 10} more${COLORS.reset}`);
      }
    }
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

// Main
function main() {
  const args = process.argv.slice(2);
  const scanExtensions = args.includes("--extensions");
  const diffIndex = args.indexOf("--diff");
  const diffRef = diffIndex !== -1 ? args[diffIndex + 1] : null;
  const verbose = args.includes("--verbose");

  console.log(`${COLORS.cyan}╔════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.cyan}║     Wildvine Security Scanner          ║${COLORS.reset}`);
  console.log(`${COLORS.cyan}╚════════════════════════════════════════╝${COLORS.reset}\n`);

  if (diffRef) {
    scanGitDiff(diffRef);
  } else if (scanExtensions) {
    console.log("Scanning extensions directory...\n");
    scanDirectory("extensions");
  } else {
    console.log("Scanning entire codebase...\n");
    scanDirectory("src");
    scanDirectory("extensions");
    scanDirectory("scripts");
  }

  printReport();

  // Exit with error if critical/high findings
  const criticalCount = findings.filter(
    (f) => f.severity === "critical" || f.severity === "high",
  ).length;
  if (criticalCount > 0) {
    console.log(
      `${COLORS.red}✗ Found ${criticalCount} critical/high severity issues${COLORS.reset}`,
    );
    process.exit(1);
  }
}

main();
