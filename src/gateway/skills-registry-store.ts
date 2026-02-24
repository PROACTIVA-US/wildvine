/**
 * Skills Registry Store — unified registry across all skill sources.
 * Backed by engine.db. Replaces CC hub-backend's skills endpoints.
 *
 * Sources: bundled (skills/), managed (~/.wildvine/skills/), project (.agents/skills/),
 *   cc (commandcentralV.0/skills/), configurable extra dirs.
 * Evaluation: weighted scoring for ingestion quality assessment.
 * Security flags → governor referral.
 */
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getEngineDb } from "./engine-store.js";

export interface SkillEntry {
  name: string;
  description: string | null;
  priority: string;
  keywords: string | null; // JSON array
  source: string;
  path: string | null;
  content: string | null;
  eval_score: number | null;
  eval_details: string | null; // JSON
  security_flags: string | null; // JSON array
  created_at: number;
  updated_at: number;
}

export interface SkillResolution {
  task: string;
  matches: Array<{
    name: string;
    priority: string;
    score: number;
    description: string | null;
  }>;
}

// Evaluation weights
const EVAL_WEIGHTS = {
  keyword_relevance: 0.3,
  routing_logic: 0.25,
  quality: 0.2,
  negative_examples: 0.15,
  templates: 0.1,
};

let _db: DatabaseSync | null = null;
function db(): DatabaseSync {
  if (!_db) {
    _db = getEngineDb();
  }
  return _db;
}

export function listSkills(opts?: { source?: string; limit?: number }): SkillEntry[] {
  const lim = opts?.limit ?? 200;
  if (opts?.source) {
    return db()
      .prepare(`SELECT * FROM skills_registry WHERE source = ? ORDER BY priority, name LIMIT ?`)
      .all(opts.source, lim) as unknown as SkillEntry[];
  }
  return db()
    .prepare(`SELECT * FROM skills_registry ORDER BY priority, name LIMIT ?`)
    .all(lim) as unknown as SkillEntry[];
}

export function getSkill(name: string): SkillEntry | null {
  const row = db().prepare(`SELECT * FROM skills_registry WHERE name = ?`).get(name);
  return (row as SkillEntry | undefined) ?? null;
}

export function upsertSkill(opts: {
  name: string;
  description?: string;
  priority?: string;
  keywords?: string[];
  source: string;
  path?: string;
  content?: string;
  eval_score?: number;
  eval_details?: unknown;
  security_flags?: string[];
}): SkillEntry {
  const now = Date.now();
  const keywordsStr = opts.keywords ? JSON.stringify(opts.keywords) : null;
  const evalDetailsStr = opts.eval_details ? JSON.stringify(opts.eval_details) : null;
  const secFlagsStr = opts.security_flags ? JSON.stringify(opts.security_flags) : null;

  const existing = getSkill(opts.name);
  if (existing) {
    db()
      .prepare(
        `UPDATE skills_registry SET
          description = COALESCE(?, description),
          priority = COALESCE(?, priority),
          keywords = COALESCE(?, keywords),
          source = ?,
          path = COALESCE(?, path),
          content = COALESCE(?, content),
          eval_score = COALESCE(?, eval_score),
          eval_details = COALESCE(?, eval_details),
          security_flags = COALESCE(?, security_flags),
          updated_at = ?
         WHERE name = ?`,
      )
      .run(
        opts.description ?? null,
        opts.priority ?? null,
        keywordsStr,
        opts.source,
        opts.path ?? null,
        opts.content ?? null,
        opts.eval_score ?? null,
        evalDetailsStr,
        secFlagsStr,
        now,
        opts.name,
      );
    return getSkill(opts.name)!;
  }

  db()
    .prepare(
      `INSERT INTO skills_registry (name, description, priority, keywords, source, path, content, eval_score, eval_details, security_flags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.name,
      opts.description ?? null,
      opts.priority ?? "P2",
      keywordsStr,
      opts.source,
      opts.path ?? null,
      opts.content ?? null,
      opts.eval_score ?? null,
      evalDetailsStr,
      secFlagsStr,
      now,
      now,
    );
  return getSkill(opts.name)!;
}

export function resolveSkills(taskDescription: string): SkillResolution {
  // Simple keyword-based resolution: score each skill against the task description
  const allSkills = listSkills();
  const taskWords = taskDescription.toLowerCase().split(/\s+/);
  const scored: Array<{
    name: string;
    priority: string;
    score: number;
    description: string | null;
  }> = [];

  for (const skill of allSkills) {
    let score = 0;
    const keywords: string[] = skill.keywords ? JSON.parse(skill.keywords) : [];
    const nameWords = skill.name.toLowerCase().split(/[_\-\s]+/);
    const descWords = (skill.description ?? "").toLowerCase().split(/\s+/);

    // Keyword match
    let kwMatches = 0;
    for (const kw of keywords) {
      if (taskWords.some((w) => w.includes(kw.toLowerCase()))) {
        kwMatches++;
      }
    }
    score +=
      keywords.length > 0 ? (kwMatches / keywords.length) * EVAL_WEIGHTS.keyword_relevance : 0;

    // Name match
    let nameMatches = 0;
    for (const nw of nameWords) {
      if (taskWords.some((w) => w.includes(nw))) {
        nameMatches++;
      }
    }
    score +=
      nameWords.length > 0 ? (nameMatches / nameWords.length) * EVAL_WEIGHTS.routing_logic : 0;

    // Description overlap
    let descMatches = 0;
    for (const dw of descWords) {
      if (dw.length > 3 && taskWords.includes(dw)) {
        descMatches++;
      }
    }
    score += descWords.length > 0 ? Math.min(1, descMatches / 3) * EVAL_WEIGHTS.quality : 0;

    // Priority boost: P0 gets more weight
    if (skill.priority === "P0") {
      score += 0.1;
    } else if (skill.priority === "P1") {
      score += 0.05;
    }

    if (score > 0.05) {
      scored.push({
        name: skill.name,
        priority: skill.priority,
        score,
        description: skill.description,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return { task: taskDescription, matches: scored.slice(0, 10) };
}

export function evaluateSkill(content: string): {
  score: number;
  details: Record<string, number>;
  security_flags: string[];
} {
  const details: Record<string, number> = {};
  const securityFlags: string[] = [];

  // keyword_relevance: check for keywords section
  details.keyword_relevance = /keywords?[\s:]/i.test(content) ? 0.8 : 0.3;

  // routing_logic: check for trigger/when sections
  details.routing_logic = /(?:trigger|when|route|match)[\s:]/i.test(content) ? 0.8 : 0.3;

  // quality: check for description, instructions
  details.quality =
    content.length > 200 && /(?:description|instructions?|steps?)[\s:]/i.test(content) ? 0.8 : 0.4;

  // negative_examples: check for negative/avoid sections
  details.negative_examples = /(?:negative|avoid|don't|do not)[\s:]/i.test(content) ? 0.8 : 0.2;

  // templates: check for template/example sections
  details.templates = /(?:template|example|sample)[\s:]/i.test(content) ? 0.8 : 0.2;

  // Security checks
  if (/(?:exec|eval|system|spawn|child_process|rm\s+-rf)/i.test(content)) {
    securityFlags.push("code_execution");
  }
  if (/(?:password|secret|token|api[_\s]?key)/i.test(content)) {
    securityFlags.push("credential_access");
  }
  if (/(?:fetch|http|curl|wget|request)/i.test(content)) {
    securityFlags.push("network_access");
  }

  const score = Object.entries(details).reduce(
    (sum, [key, val]) => sum + val * (EVAL_WEIGHTS[key as keyof typeof EVAL_WEIGHTS] ?? 0),
    0,
  );

  return { score, details, security_flags: securityFlags };
}

export function scanDirectory(
  dirPath: string,
  source: string,
): { added: number; updated: number; errors: string[] } {
  let added = 0;
  let updated = 0;
  const errors: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return { added: 0, updated: 0, errors: [`Directory not found: ${dirPath}`] };
  }

  const files = fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".md") || f.endsWith(".yaml") || f.endsWith(".yml"));
  for (const file of files) {
    try {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const name = path.basename(file, path.extname(file));
      const existing = getSkill(name);

      // Extract description from first paragraph or frontmatter
      const descMatch = content.match(/^#\s+.+\n+(.+)/m) ?? content.match(/description:\s*(.+)/i);
      const description = descMatch?.[1]?.trim() ?? null;

      // Extract keywords
      const kwMatch = content.match(/keywords?:\s*\[?([^\]\n]+)/i);
      const keywords = kwMatch
        ? kwMatch[1].split(",").map((k) => k.trim().replace(/['"]/g, ""))
        : [];

      const evaluation = evaluateSkill(content);

      upsertSkill({
        name,
        description,
        keywords,
        source,
        path: filePath,
        content,
        eval_score: evaluation.score,
        eval_details: evaluation.details,
        security_flags: evaluation.security_flags,
      });

      if (existing) {
        updated++;
      } else {
        added++;
      }
    } catch (err) {
      errors.push(`Error processing ${file}: ${err}`);
    }
  }

  return { added, updated, errors };
}
