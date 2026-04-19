/**
 * Notifications + Outcome Feedback routes.
 *
 * 1. GET /notifications — fetch pending proactive notifications
 * 2. POST /notifications/:id/dismiss — dismiss a notification
 * 3. POST /outcome — record outcome feedback for a past decision
 * 4. GET /action-suggestion — get a pre-built action (email draft, task) for a notification
 */
import { Router } from "express";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { nanoid } from "nanoid";
import { runProactiveChecks, type ProactiveNotification } from "../orchestration/proactive.js";
import { writeMemory, writeTwinInsight } from "../memory/retrieval.js";
import { text } from "../infra/compute/index.js";
import { runSparseAnalysis } from "../cognition/sparse-analysis.js";
import { generateSelfPortrait } from "../cognition/self-portrait.js";

const router = Router();

// ── Get current notifications (run checks on demand) ───────────────────────

router.get("/", (_req, res) => {
  try {
    const notifications = runProactiveChecks();
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dismiss a notification ─────────────────────────────────────────────────

router.post("/:id/dismiss", (req, res) => {
  // Record that user dismissed this notification (so we don't repeat it)
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, "Proactive", `dismissed:${req.params.id}`, "success");
  res.json({ ok: true });
});

// ── Outcome Feedback — user reports how a past decision went ───────────────

router.post("/outcome", (req, res) => {
  const { decisionId, outcome, note } = req.body;
  if (!decisionId || !outcome) return res.status(400).json({ error: "decisionId and outcome required" });

  const validOutcomes = ["success", "failure", "partial", "waiting"];
  if (!validOutcomes.includes(outcome)) return res.status(400).json({ error: "outcome must be: success, failure, partial, waiting" });

  // Update the decision node status
  if (outcome === "success") {
    db.prepare("UPDATE graph_nodes SET status='done', detail=detail||? WHERE id=? AND user_id=?")
      .run(` [Outcome: success${note ? ` — ${note}` : ""}]`, decisionId, DEFAULT_USER_ID);
  } else if (outcome === "failure") {
    db.prepare("UPDATE graph_nodes SET status='blocked', detail=detail||? WHERE id=? AND user_id=?")
      .run(` [Outcome: failed${note ? ` — ${note}` : ""}]`, decisionId, DEFAULT_USER_ID);
  }

  // Record as episodic memory for Twin learning
  writeMemory({
    type: "episodic",
    title: `Decision outcome: ${outcome}`,
    content: `Decision ${decisionId} resulted in ${outcome}.${note ? ` Note: ${note}` : ""}`,
    tags: ["outcome", outcome, "feedback"],
    source: "User Feedback",
    confidence: 1.0, // user-reported = highest confidence
  });

  // Record satisfaction signal
  const value = outcome === "success" ? 1.0 : outcome === "partial" ? 0.5 : outcome === "failure" ? -1.0 : 0;
  db.prepare("INSERT INTO satisfaction_signals (id, user_id, signal_type, context, value) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, "outcome_feedback", decisionId, value);

  // Write Twin insight if clear pattern
  if (outcome === "failure") {
    writeTwinInsight({
      category: "decision_outcome",
      insight: `Recent decision failed: ${note || "no details"}. Consider adjusting approach.`,
      confidence: 0.7,
    });
  }

  res.json({ ok: true, recorded: outcome });
});

// ── Action Suggestion — pre-build action for a notification ────────────────
// e.g., "Draft follow-up email to Sarah" → returns email subject + body

router.post("/suggest-action", async (req, res) => {
  const { personLabel, context, actionType } = req.body;

  if (actionType === "send_email" && personLabel) {
    try {
      // Use cheap LLM to draft an email based on graph context
      const personNode = db.prepare("SELECT label, detail FROM graph_nodes WHERE user_id=? AND label LIKE ?")
        .get(DEFAULT_USER_ID, `%${personLabel}%`) as any;

      const emailDraft = await text({
        task: "twin_edit_learning", // cheap model
        system: `You are drafting a brief follow-up email. Be concise (3-4 sentences). Professional but warm. Reference the context provided.`,
        messages: [{
          role: "user",
          content: `Draft a follow-up email to ${personLabel}. Context: ${personNode?.detail ?? context ?? "general follow-up"}. Keep it under 100 words.`,
        }],
        maxTokens: 200,
      });

      // Try to find their email from contacts
      const contactEmail = db.prepare("SELECT detail FROM graph_nodes WHERE user_id=? AND label LIKE ? AND type='person'")
        .get(DEFAULT_USER_ID, `%${personLabel}%`) as any;

      // Extract email from detail if it contains one
      const emailMatch = contactEmail?.detail?.match(/[\w.-]+@[\w.-]+\.\w+/);

      res.json({
        to: emailMatch?.[0] ?? "",
        subject: `Following up`,
        body: emailDraft,
        personLabel,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(400).json({ error: "Unsupported action type" });
  }
});

// ── Sparse Analysis — deep inference from any amount of data ───────────────

router.get("/analysis", async (_req, res) => {
  try {
    const result = await runSparseAnalysis();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Self-Portrait — reveals what you can't see about yourself ──────────────

router.get("/self-portrait", async (_req, res) => {
  try {
    const portrait = await generateSelfPortrait();
    res.json(portrait);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Verify hypothesis — user confirms or denies an inference ───────────────

router.post("/verify", (req, res) => {
  const { insightContent, isCorrect, correction } = req.body;
  if (!insightContent || isCorrect === undefined) return res.status(400).json({ error: "insightContent and isCorrect required" });

  // Record verification as high-confidence memory
  writeMemory({
    type: "semantic",
    title: isCorrect ? "Verified: correct" : "Verified: incorrect",
    content: `${insightContent}${correction ? ` → Correction: ${correction}` : ""}`,
    tags: ["verification", isCorrect ? "confirmed" : "denied"],
    source: "User Verification",
    confidence: 1.0,
  });

  // If incorrect, write a correction insight for Twin
  if (!isCorrect && correction) {
    writeTwinInsight({
      category: "correction",
      insight: `User corrected: "${insightContent}" → "${correction}"`,
      confidence: 1.0,
    });
  }

  res.json({ ok: true, recorded: isCorrect ? "confirmed" : "denied" });
});

export default router;
