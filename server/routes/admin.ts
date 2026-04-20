import { Router } from "express";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { setApiKey, deleteApiKey, getApiKey } from "../infra/compute/keys.js";
import { getRegistryInfo } from "../execution/registry.js";
import { getHandStatus } from "../infra/hand/index.js";
import { getMCPStatus } from "../infra/mcp/index.js";
import { getRAGStatus } from "../infra/rag/index.js";
import { getPermissionStatus, activateLockdown, deactivateLockdown, isLocked, setTrustLevel } from "../permission/gate.js";
import { type PermissionLevel, type ActionClass } from "../permission/levels.js";
import { PROVIDERS, MODELS } from "../infra/compute/providers.js";
import { getCapabilityRoster } from "../infra/compute/index.js";
import {
  getCostSummary, getPerformanceSummary, getRecentCalls, getCallDetail,
  getRouteOverride, setRouteOverride, clearRouteOverride, getAllOverrides,
} from "../infra/compute/telemetry.js";
import { TASK_ROUTES } from "../infra/compute/router.js";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const router = Router();

// ── Get full roster for a capability (active + inactive models/providers) ───
router.get("/capability/:cap", (req, res) => {
  try {
    const roster = getCapabilityRoster(req.params.cap as any);
    res.json(roster);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Save an API key ─────────────────────────────────────────────────────────
router.put("/providers/:id/key", (req, res) => {
  const { id } = req.params;
  const { key } = req.body;
  if (!key || typeof key !== "string") {
    return res.status(400).json({ error: "key required" });
  }
  try {
    setApiKey(id, key);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Delete an API key ───────────────────────────────────────────────────────
router.delete("/providers/:id/key", (req, res) => {
  deleteApiKey(req.params.id);
  res.json({ ok: true });
});

// ── Test a provider's key with a tiny call ──────────────────────────────────
router.post("/providers/:id/test", async (req, res) => {
  const { id } = req.params;
  const provider = PROVIDERS.find(p => p.id === id);
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const key = getApiKey(id);
  if (!key) return res.status(400).json({ error: "No key configured for this provider" });

  // Pick a minimal test model for each provider
  const testModels: Record<string, string> = {
    anthropic: "claude-haiku-4-5-20251001",
    openai: "gpt-4o-mini",
    google: "gemini-2.0-flash",
    deepseek: "deepseek-chat",
    qwen: "qwen-turbo",
    mistral: "mistral-small-latest",
    xai: "grok-3-mini",
    groq: "llama-3.3-70b-versatile",
    moonshot: "kimi-k2.5",
    zhipu: "glm-4-flash",
    together: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    perplexity: "sonar",
    openrouter: "meta-llama/llama-3.3-70b-instruct",
    fireworks: "accounts/fireworks/models/llama-v3p3-70b-instruct",
  };

  const modelId = testModels[id];
  if (!modelId) return res.status(400).json({ error: "No test model configured for this provider" });

  try {
    let model: any;
    switch (provider.protocol) {
      case "anthropic":
        model = createAnthropic({ apiKey: key })(modelId);
        break;
      case "google":
        model = createGoogleGenerativeAI({ apiKey: key })(modelId);
        break;
      case "openai-compat":
        model = createOpenAI({ apiKey: key, ...(provider.baseURL ? { baseURL: provider.baseURL } : {}) })(modelId);
        break;
    }

    const start = Date.now();
    const result = await generateText({
      model,
      messages: [{ role: "user", content: "Say 'ok' and nothing else." }],
      maxOutputTokens: 16,
    });
    const latency = Date.now() - start;

    res.json({
      ok: true,
      provider: provider.name,
      model: modelId,
      response: result.text.slice(0, 60),
      latencyMs: latency,
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      error: err.message?.slice(0, 200) ?? "Unknown error",
    });
  }
});

// ── Telemetry: costs + performance ──────────────────────────────────────────

router.get("/costs", (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  res.json(getCostSummary(days));
});

router.get("/performance", (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  res.json(getPerformanceSummary(days));
});

router.get("/calls", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  res.json(getRecentCalls(limit));
});

router.get("/calls/:id", (req, res) => {
  const call = getCallDetail(req.params.id);
  if (!call) return res.status(404).json({ error: "Not found" });
  res.json(call);
});

// ── Route overrides ─────────────────────────────────────────────────────────

router.get("/overrides", (_req, res) => {
  res.json(getAllOverrides());
});

router.put("/overrides/:task", (req, res) => {
  const { modelId } = req.body;
  if (!modelId) return res.status(400).json({ error: "modelId required" });
  const task = req.params.task;
  if (!TASK_ROUTES[task]) return res.status(400).json({ error: "Unknown task" });
  if (!MODELS.find(m => m.id === modelId)) return res.status(400).json({ error: "Unknown model" });
  setRouteOverride(task, modelId);
  res.json({ ok: true });
});

router.delete("/overrides/:task", (req, res) => {
  clearRouteOverride(req.params.task);
  res.json({ ok: true });
});

// ── Tool registry ───────────────────────────────────────────────────────────

router.get("/tools", (_req, res) => {
  res.json(getRegistryInfo());
});

// ── Permission status ───────────────────────────────────────────────────────

router.get("/permissions", (_req, res) => {
  res.json({ ...getPermissionStatus(), lockdown: isLocked() });
});

router.post("/permissions/lockdown", (_req, res) => {
  activateLockdown();
  res.json({ ok: true, lockdown: true });
});

router.delete("/permissions/lockdown", (_req, res) => {
  deactivateLockdown();
  res.json({ ok: true, lockdown: false });
});

router.put("/permissions/trust/:actionClass", (req, res) => {
  const { level } = req.body;
  setTrustLevel(req.params.actionClass as ActionClass, level as PermissionLevel);
  res.json({ ok: true });
});

// ── Infrastructure status ────────────────────────────────────────────────────

router.get("/infra", (_req, res) => {
  res.json({
    hand: getHandStatus(),
    mcp: getMCPStatus(),
    rag: getRAGStatus(),
  });
});

// ── System Health Dashboard ─────────────────────────────────────────────────

router.get("/health", (_req, res) => {
  try {
    // Confirm rate
    const totalConfirms = (db.prepare("SELECT COUNT(*) as c FROM satisfaction_signals WHERE user_id=? AND signal_type='plan_confirmed'").get(DEFAULT_USER_ID) as any)?.c ?? 0;
    const totalRejects = (db.prepare("SELECT COUNT(*) as c FROM satisfaction_signals WHERE user_id=? AND signal_type='plan_rejected'").get(DEFAULT_USER_ID) as any)?.c ?? 0;
    const totalDecisions = totalConfirms + totalRejects;
    const confirmRate = totalDecisions > 0 ? Math.round((totalConfirms / totalDecisions) * 100) : 0;

    // Avg response time (from llm_calls)
    const avgLatency = (db.prepare("SELECT AVG(latency_ms) as avg FROM llm_calls WHERE task='decision' AND created_at >= datetime('now', '-7 days')").get() as any)?.avg ?? 0;

    // Skill reuse
    const totalSkills = (db.prepare("SELECT COUNT(*) as c FROM skills WHERE user_id=?").get(DEFAULT_USER_ID) as any)?.c ?? 0;
    const usedSkills = (db.prepare("SELECT COUNT(*) as c FROM skills WHERE user_id=? AND use_count > 0").get(DEFAULT_USER_ID) as any)?.c ?? 0;

    // Silent failures (agent_executions with status 'failed' in last 24h)
    const failures24h = (db.prepare("SELECT COUNT(*) as c FROM agent_executions WHERE user_id=? AND status='failed' AND created_at >= datetime('now', '-24 hours')").get(DEFAULT_USER_ID) as any)?.c ?? 0;

    // Top failure agents
    const topFailures = db.prepare(
      "SELECT agent, COUNT(*) as cnt FROM agent_executions WHERE user_id=? AND status='failed' AND created_at >= datetime('now', '-7 days') GROUP BY agent ORDER BY cnt DESC LIMIT 5"
    ).all(DEFAULT_USER_ID) as any[];

    // Evolution state
    const evolutionDims = db.prepare("SELECT dimension, current_value, evidence_count FROM evolution_state WHERE user_id=?").all(DEFAULT_USER_ID) as any[];

    // Dream log (last run)
    const lastDream = db.prepare("SELECT * FROM dream_log ORDER BY created_at DESC LIMIT 1").get() as any;

    // Permission audit summary
    const auditSummary = db.prepare(
      "SELECT decision, COUNT(*) as cnt FROM permission_audit WHERE created_at >= datetime('now', '-7 days') GROUP BY decision"
    ).all() as any[];

    res.json({
      confirmRate,
      totalDecisions,
      avgResponseMs: Math.round(avgLatency),
      skills: { total: totalSkills, used: usedSkills, reuseRate: totalSkills > 0 ? Math.round((usedSkills / totalSkills) * 100) : 0 },
      failures24h,
      topFailures,
      evolution: evolutionDims,
      lastDream,
      permissionAudit: auditSummary,
    });
  } catch (err: any) {
    // Some tables may not exist yet — return partial data gracefully
    res.json({
      confirmRate: 0, totalDecisions: 0, avgResponseMs: 0,
      skills: { total: 0, used: 0, reuseRate: 0 },
      failures24h: 0, topFailures: [], evolution: [], lastDream: null, permissionAudit: [],
      error: err.message,
    });
  }
});

// ── Agent Monitor ─────────────────────────────────────────────────────────
router.get("/agent-status", (_req, res) => {
  const SYSTEM_AGENTS = [
    "Decision Agent", "Twin Agent", "Evolution Engine", "Skills Engine",
    "Execution Agent", "Dream Engine", "GEPA Optimizer", "Proactive Agent",
    "Observation Agent", "Memory Agent", "Self-Portrait",
  ];

  const systemAgents = SYSTEM_AGENTS.map(name => {
    const stats = db.prepare(
      "SELECT status, COUNT(*) as cnt, MAX(created_at) as last_run FROM agent_executions WHERE user_id=? AND agent=? GROUP BY status"
    ).all(DEFAULT_USER_ID, name) as any[];

    const successes = stats.find((s: any) => s.status === "success")?.cnt ?? 0;
    const failures = stats.find((s: any) => s.status === "failed")?.cnt ?? 0;
    const lastRun = stats[0]?.last_run ?? null;

    return { name, successes, failures, lastRun, status: lastRun ? "active" : "never" };
  });

  const customAgents = db.prepare("SELECT id, name, created_at FROM user_agents WHERE user_id=?").all(DEFAULT_USER_ID) as any[];
  const customWithStats = customAgents.map((a: any) => {
    const stats = db.prepare(
      "SELECT COUNT(*) as runs, MAX(created_at) as last_run FROM agent_executions WHERE user_id=? AND agent=?"
    ).get(DEFAULT_USER_ID, `Custom: ${a.name}`) as any;
    return { id: a.id, name: a.name, runs: stats?.runs ?? 0, lastRun: stats?.last_run ?? null, status: "manual" };
  });

  res.json({ systemAgents, customAgents: customWithStats });
});

// ── Cron Status ───────────────────────────────────────────────────────────
router.get("/cron-status", (_req, res) => {
  const CRONS = [
    { name: "Activity Capture", pattern: "*/5 * * * *", agent: "Activity Monitor" },
    { name: "Decay Checker", pattern: "0 */6 * * *", agent: "Observation Agent" },
    { name: "Ingestion Pipeline", pattern: "0 */6 * * *", agent: "Ingestion Pipeline" },
    { name: "Graph Update", pattern: "30 */6 * * *", agent: "Activity Monitor" },
    { name: "Proactive Check", pattern: "0 */12 * * *", agent: "Orchestrator" },
    { name: "SQLite Backup", pattern: "55 2 * * *", agent: "Backup" },
    { name: "Dream Engine", pattern: "0 3 * * *", agent: "Dream Engine" },
    { name: "Evolution Engine", pattern: "0 4 * * *", agent: "Evolution Engine" },
    { name: "Morning Digest", pattern: "0 8 * * *", agent: "Observation Agent" },
    { name: "Stale Task Detector", pattern: "0 22 * * *", agent: "Workspace Agent" },
    { name: "Twin Reflection", pattern: "0 9 * * 1", agent: "Twin Agent" },
    { name: "GEPA Optimizer", pattern: "0 5 * * 0", agent: "GEPA Optimizer" },
    { name: "System Evolution", pattern: "0 6 * * 0", agent: "System Evolution" },
  ];

  const jobs = CRONS.map(c => {
    const lastExec = db.prepare(
      "SELECT created_at, status FROM agent_executions WHERE agent=? ORDER BY created_at DESC LIMIT 1"
    ).get(c.agent) as any;
    return {
      name: c.name,
      pattern: c.pattern,
      lastRun: lastExec?.created_at ?? null,
      lastStatus: lastExec?.status ?? "unknown",
    };
  });

  // User-defined crons
  const userCrons = db.prepare("SELECT * FROM user_crons WHERE user_id=? ORDER BY created_at").all(DEFAULT_USER_ID) as any[];

  res.json({ systemJobs: jobs, userCrons });
});

// ── Manual Trigger ────────────────────────────────────────────────────────
router.post("/trigger/:engine", async (req, res) => {
  const { engine } = req.params;
  try {
    switch (engine) {
      case "dream": {
        const { runDream } = await import("../memory/dream.js");
        const stats = await runDream();
        return res.json({ ok: true, engine, result: stats });
      }
      case "evolution": {
        const { runPersonalEvolution } = await import("../cognition/evolution.js");
        const result = await runPersonalEvolution();
        return res.json({ ok: true, engine, result });
      }
      case "gepa": {
        const { analyzeExecutionTraces } = await import("../cognition/gepa.js");
        const result = await analyzeExecutionTraces(7);
        return res.json({ ok: true, engine, result });
      }
      case "proactive": {
        const { checkProactiveTriggers } = await import("../orchestration/enforcement.js");
        const trigger = checkProactiveTriggers();
        return res.json({ ok: true, engine, result: trigger ?? { reason: "No triggers found" } });
      }
      case "portrait": {
        const { generateSelfPortrait } = await import("../cognition/self-portrait.js");
        const result = await generateSelfPortrait();
        return res.json({ ok: true, engine, result });
      }
      default:
        return res.status(400).json({ error: `Unknown engine: ${engine}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Permission Audit Log ──────────────────────────────────────────────────
router.get("/permissions/audit", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const rows = db.prepare(
    "SELECT * FROM permission_audit ORDER BY created_at DESC LIMIT ?"
  ).all(limit);
  res.json(rows);
});

// ── Batch Delete Nodes ────────────────────────────────────────────────────
router.post("/batch-delete", (req, res) => {
  const { nodeIds } = req.body;
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) return res.status(400).json({ error: "nodeIds array required" });
  const tx = db.transaction(() => {
    for (const id of nodeIds) {
      db.prepare("DELETE FROM graph_nodes WHERE id=? AND user_id=?").run(id, DEFAULT_USER_ID);
    }
  });
  tx();
  res.json({ ok: true, deleted: nodeIds.length });
});

// ── Quality Audit ─────────────────────────────────────────────────────────
router.get("/quality-audit", (_req, res) => {
  const orphanNodes = db.prepare(`
    SELECT n.id, n.label, n.type, n.domain FROM graph_nodes n
    WHERE n.user_id=? AND NOT EXISTS (
      SELECT 1 FROM graph_edges e WHERE e.from_node_id=n.id OR e.to_node_id=n.id
    ) ORDER BY n.created_at DESC LIMIT 50
  `).all(DEFAULT_USER_ID) as any[];

  const emptyDetail = db.prepare(
    "SELECT id, label, type, domain FROM graph_nodes WHERE user_id=? AND (detail IS NULL OR detail='' OR length(detail) < 5) LIMIT 50"
  ).all(DEFAULT_USER_ID) as any[];

  const shortLabels = db.prepare(
    "SELECT id, label, type, domain FROM graph_nodes WHERE user_id=? AND length(label) < 5 LIMIT 50"
  ).all(DEFAULT_USER_ID) as any[];

  res.json({ orphanNodes, emptyDetail, shortLabels });
});

export default router;
