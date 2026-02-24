import type { GatewayRequestHandlers } from "./types.js";
import { getStatusSummary } from "../../commands/status.js";
import { getEngineDb } from "../engine-store.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import { HEALTH_REFRESH_INTERVAL_MS } from "../server-constants.js";
import { formatError } from "../server-utils.js";
import { formatForLog } from "../ws-log.js";

export const healthHandlers: GatewayRequestHandlers = {
  health: async ({ respond, context, params }) => {
    const { getHealthCache, refreshHealthSnapshot, logHealth } = context;
    const wantsProbe = params?.probe === true;
    const now = Date.now();
    const cached = getHealthCache();
    if (!wantsProbe && cached && now - cached.ts < HEALTH_REFRESH_INTERVAL_MS) {
      respond(true, cached, undefined, { cached: true });
      void refreshHealthSnapshot({ probe: false }).catch((err) =>
        logHealth.error(`background health refresh failed: ${formatError(err)}`),
      );
      return;
    }
    try {
      const snap = await refreshHealthSnapshot({ probe: wantsProbe });
      respond(true, snap, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },
  status: async ({ respond }) => {
    const status = await getStatusSummary();
    respond(true, status, undefined);
  },
  "cc.health": async ({ respond }) => {
    try {
      const db = getEngineDb();
      // Quick integrity check
      const tables = db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'kb_fts%'`,
        )
        .all() as unknown as { name: string }[];
      const counts: Record<string, number> = {};
      for (const t of tables) {
        const row = db.prepare(`SELECT COUNT(*) AS cnt FROM "${t.name}"`).get() as { cnt: number };
        counts[t.name] = row.cnt;
      }
      respond(true, {
        status: "healthy",
        engine: "native",
        subsystems: {
          governor: { status: "ok", referrals: counts.governor_referrals ?? 0 },
          inbox: { status: "ok", items: counts.inbox_items ?? 0 },
          idealzr: {
            status: "ok",
            goals: counts.goals ?? 0,
            hypotheses: counts.hypotheses ?? 0,
            evidence: counts.evidence ?? 0,
          },
          kb: { status: "ok", documents: counts.kb_documents ?? 0 },
          arena: {
            status: "ok",
            sessions: counts.arena_sessions ?? 0,
            messages: counts.arena_messages ?? 0,
          },
          skills: { status: "ok", registered: counts.skills_registry ?? 0 },
          pipelines: {
            status: "ok",
            definitions: counts.pipelines ?? 0,
            runs: counts.pipeline_runs ?? 0,
          },
          notes: { status: "ok", count: counts.notes ?? 0 },
        },
      });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};
