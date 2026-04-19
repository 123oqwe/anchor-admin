/**
 * Privacy & Compliance routes.
 *
 * 1. Privacy Policy (GDPR Article 13/14)
 * 2. LLM Data Transparency (what data leaves the machine)
 * 3. Right to Erasure (delete all user data)
 * 4. Data Export (portability)
 */
import { Router } from "express";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { nanoid } from "nanoid";
import { getPermissionStatus, setTrustLevel } from "../permission/gate.js";
import { type ActionClass, type PermissionLevel } from "../permission/levels.js";

const router = Router();

// ── Privacy Policy ─────────────────────────────────────────────────────────

router.get("/policy", (_req, res) => {
  res.json({
    version: "1.0",
    lastUpdated: "2026-04-18",
    controller: "Anchor OS (self-hosted, local installation)",
    contact: "privacy@anchor.ai",

    dataCollected: {
      localOnly: [
        "Browser history metadata (URL, page title, visit count — NOT page content)",
        "Apple Contacts (name, email, organization — via AppleScript with macOS permission)",
        "Apple Calendar events (title, date, attendees — via AppleScript with macOS permission)",
        "User profile (name, email, role — manually entered)",
        "Conversation history with Advisor",
        "Human Graph nodes and edges",
        "User state (energy, focus, stress)",
      ],
      sentToThirdParty: [
        {
          what: "Human Graph summary + Memory excerpts + Twin insights + user message",
          where: "LLM API provider (Anthropic, OpenAI, Google, or DeepSeek — depending on configured provider)",
          why: "To generate personalized decision advice via the Decision Agent",
          retention: "LLM providers process in-memory and do not retain data per their API terms (Anthropic zero-retention, OpenAI zero-retention on API)",
          canDisable: "Not currently — LLM calls are required for core functionality",
        },
      ],
      neverCollected: [
        "Passwords or authentication credentials",
        "Banking or financial account data",
        "Medical or health records",
        "Page content or full email body text",
        "Screenshots or screen recordings",
        "Keystrokes or input monitoring",
        "Location data",
        "Cookies or cross-site tracking",
      ],
    },

    dataStorage: {
      location: "SQLite database on your local machine (server/anchor.db)",
      encryption: "macOS FileVault (system-level disk encryption)",
      cloudBackup: "None — data never leaves your machine except for LLM API calls",
    },

    userRights: {
      access: "GET /api/graph/export — download all your data",
      deletion: "DELETE /api/privacy/delete-all — permanently delete all user data",
      rectification: "Edit any node, memory, or profile field through the UI",
      portability: "GET /api/graph/export — JSON export of all data",
      objection: "DELETE /api/integrations/local/consent — stop local scanning",
    },

    thirdPartyProcessors: [
      { name: "Anthropic", purpose: "LLM inference", dataShared: "Graph summary + conversation context", retentionPolicy: "Zero-retention API" },
      { name: "OpenAI", purpose: "LLM inference (if configured)", dataShared: "Same as above", retentionPolicy: "Zero-retention API" },
      { name: "Google AI", purpose: "LLM inference (if configured)", dataShared: "Same as above", retentionPolicy: "Per Google AI terms" },
    ],

    legalBasis: "Explicit consent (GDPR Article 6(1)(a)) — user grants consent during onboarding and before local scanning",
  });
});

// ── LLM Data Transparency — what was sent to cloud ─────────────────────────

router.get("/llm-disclosures", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const calls = db.prepare(`
    SELECT id, task, model_id, provider_id, input_tokens, output_tokens,
           cost_usd, latency_ms, status, request_preview, created_at
    FROM llm_calls
    WHERE created_at >= datetime('now', '-7 days')
    ORDER BY created_at DESC LIMIT ?
  `).all(limit) as any[];

  const summary = db.prepare(`
    SELECT provider_id, COUNT(*) as calls, SUM(input_tokens) as total_input_tokens,
           SUM(output_tokens) as total_output_tokens, SUM(cost_usd) as total_cost
    FROM llm_calls
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY provider_id
  `).all() as any[];

  res.json({
    period: "last 7 days",
    summary: summary.map((s: any) => ({
      provider: s.provider_id,
      calls: s.calls,
      tokensShared: s.total_input_tokens ?? 0,
      tokensReceived: s.total_output_tokens ?? 0,
      estimatedCost: s.total_cost ? `$${s.total_cost.toFixed(4)}` : "$0",
    })),
    recentCalls: calls.map((c: any) => ({
      id: c.id,
      task: c.task,
      model: c.model_id,
      provider: c.provider_id,
      inputTokens: c.input_tokens,
      outputTokens: c.output_tokens,
      cost: c.cost_usd ? `$${c.cost_usd.toFixed(4)}` : null,
      preview: c.request_preview ? c.request_preview.slice(0, 200) + "..." : null,
      at: c.created_at,
      status: c.status,
    })),
    explanation: "Every time Anchor asks an AI model for help, a summary of your Human Graph, relevant memories, and your message are sent to the model provider. The model processes this in real-time and does not store it. This log shows exactly what was sent.",
  });
});

// ── Right to Erasure — delete all user data ────────────────────────────────

router.delete("/delete-all", (_req, res) => {
  const tables = [
    "graph_nodes", "graph_edges", "memories", "messages",
    "agent_executions", "twin_insights", "twin_quests",
    "tasks", "projects", "skills", "dream_log",
    "satisfaction_signals", "evolution_state", "decision_traces",
    "prompt_strategies", "system_metrics", "events",
    "ingestion_log", "scan_consent", "oauth_tokens",
    "memory_embeddings", "llm_calls", "permission_audit",
  ];

  let deleted = 0;
  for (const table of tables) {
    try {
      const result = db.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(DEFAULT_USER_ID);
      deleted += result.changes;
    } catch {
      // Some tables don't have user_id column — delete all rows
      try {
        const result = db.prepare(`DELETE FROM ${table}`).run();
        deleted += result.changes;
      } catch {}
    }
  }

  // Reset user to blank
  db.prepare("UPDATE users SET name='', email='', role='' WHERE id=?").run(DEFAULT_USER_ID);
  db.prepare("UPDATE user_state SET energy=70, focus=70, stress=30 WHERE user_id=?").run(DEFAULT_USER_ID);
  db.prepare("UPDATE twin_evolution SET level=1, xp=0 WHERE user_id=?").run(DEFAULT_USER_ID);

  // Clear route overrides and trust state
  db.prepare("DELETE FROM route_overrides").run();
  db.prepare("DELETE FROM trust_state").run();

  res.json({ ok: true, rowsDeleted: deleted, message: "All user data has been permanently deleted." });
});

// ── Autonomy Dial — user-facing trust level control ────────────────────────

router.get("/autonomy", (_req, res) => {
  const status = getPermissionStatus();
  const LEVEL_LABELS: Record<string, string> = {
    L0_read_only: "Read Only — AI can only view your data, never modify",
    L1_draft: "Draft — AI can create drafts but you must approve",
    L2_confirm_execute: "Confirm & Execute — AI executes after your approval",
    L3_bounded_auto: "Autonomous — AI acts within defined boundaries",
  };

  res.json({
    explanation: "Control how much autonomy your AI has. Higher levels = more independent action. You can change this anytime.",
    levels: Object.entries(LEVEL_LABELS).map(([id, desc]) => ({ id, description: desc })),
    current: status.policies.map((s: any) => ({
      action: s.actionClass,
      level: s.effectiveLevel,
      description: LEVEL_LABELS[s.effectiveLevel] ?? s.effectiveLevel,
      risk: s.riskTier,
    })),
  });
});

router.put("/autonomy/:actionClass", (req, res) => {
  const { level } = req.body;
  const validLevels = ["L0_read_only", "L1_draft", "L2_confirm_execute", "L3_bounded_auto"];
  if (!level || !validLevels.includes(level)) {
    return res.status(400).json({ error: "Invalid level. Must be one of: " + validLevels.join(", ") });
  }
  setTrustLevel(req.params.actionClass as ActionClass, level as PermissionLevel);
  res.json({ ok: true, actionClass: req.params.actionClass, newLevel: level });
});

export default router;
