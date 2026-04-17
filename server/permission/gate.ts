/**
 * L6 Permission & Trust — Pre-execution gate.
 *
 * Every side-effecting action passes through checkPermission().
 * Includes:
 * - Policy-based allow/deny/confirm
 * - Rate limiting per action class
 * - Trust progression (auto-upgrade after clean track record)
 * - Cron source restriction
 * - Derived-write prohibition
 * - Contract violation detection
 * - Immutable audit trail
 */
import { DEFAULT_POLICY, LEVEL_ORDER, type ActionClass, type PermissionLevel, type RiskTier, CONTRACT_VIOLATIONS } from "./levels.js";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { nanoid } from "nanoid";

// ── Gate types ──────────────────────────────────────────────────────────────

export type GateOutcome =
  | { decision: "allow"; auditId: string }
  | { decision: "require_confirmation"; reason: string; actionClass: ActionClass }
  | { decision: "deny"; reason: string };

export interface GateRequest {
  actionClass: ActionClass;
  description: string;
  source: "user_triggered" | "cron" | "agent_chain";
  metadata?: Record<string, any>;
}

// ── Rate limiter state ──────────────────────────────────────────────────────

const rateCounts = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(actionClass: ActionClass, maxPerHour: number): boolean {
  if (maxPerHour <= 0) return true; // unlimited

  const key = actionClass;
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const bucket = rateCounts.get(key);

  if (!bucket || now - bucket.windowStart > hourMs) {
    rateCounts.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= maxPerHour) {
    return false; // rate limited
  }

  bucket.count++;
  return true;
}

// ── Trust progression state ─────────────────────────────────────────────────

const trustScores = new Map<ActionClass, { successes: number; failures: number; currentLevel: PermissionLevel }>();

function getTrustLevel(actionClass: ActionClass): PermissionLevel {
  const policy = DEFAULT_POLICY[actionClass];
  if (!policy) return "L2_confirm_execute";

  const score = trustScores.get(actionClass);
  if (!score) return policy.defaultLevel;

  return score.currentLevel;
}

/** After successful execution, record success for trust progression. */
export function recordSuccess(actionClass: ActionClass): void {
  const policy = DEFAULT_POLICY[actionClass];
  if (!policy) return;

  let score = trustScores.get(actionClass);
  if (!score) {
    score = { successes: 0, failures: 0, currentLevel: policy.defaultLevel };
    trustScores.set(actionClass, score);
  }

  score.successes++;

  // Trust progression: after 10 clean successes, upgrade one level
  if (score.successes >= 10 && score.failures === 0) {
    const currentIdx = LEVEL_ORDER.indexOf(score.currentLevel);
    if (currentIdx < LEVEL_ORDER.length - 1) {
      const newLevel = LEVEL_ORDER[currentIdx + 1];
      // Never auto-upgrade past L2 for high/critical risk
      if (policy.riskTier === "high" || policy.riskTier === "critical") {
        if (LEVEL_ORDER.indexOf(newLevel) > LEVEL_ORDER.indexOf("L2_confirm_execute")) return;
      }
      score.currentLevel = newLevel;
      score.successes = 0; // reset counter
      console.log(`[Trust] ${actionClass} upgraded to ${newLevel} (10 consecutive successes)`);
      auditLog("TrustProgression", `${actionClass} upgraded to ${newLevel}`);
    }
  }
}

/** After failed execution, record failure and potentially downgrade. */
export function recordFailure(actionClass: ActionClass): void {
  let score = trustScores.get(actionClass);
  if (!score) {
    const policy = DEFAULT_POLICY[actionClass];
    if (!policy) return;
    score = { successes: 0, failures: 0, currentLevel: policy.defaultLevel };
    trustScores.set(actionClass, score);
  }

  score.failures++;
  score.successes = 0; // reset success streak

  // Downgrade after 3 failures
  if (score.failures >= 3) {
    const currentIdx = LEVEL_ORDER.indexOf(score.currentLevel);
    if (currentIdx > 0) {
      score.currentLevel = LEVEL_ORDER[currentIdx - 1];
      score.failures = 0;
      console.log(`[Trust] ${actionClass} downgraded to ${score.currentLevel} (3 failures)`);
      auditLog("TrustProgression", `${actionClass} downgraded to ${score.currentLevel}`);
    }
  }
}

// ── Derived-write prohibition ───────────────────────────────────────────────

function checkDerivedWriteProhibition(req: GateRequest): string | null {
  // If writing to graph and source is agent_chain (not user), check if it's derived data
  if (req.actionClass === "write_graph" && req.source === "agent_chain") {
    const desc = req.description.toLowerCase();
    // Twin/Decision output writing directly to graph without user intermediary
    if (desc.includes("twin") || desc.includes("decision") || desc.includes("inferred")) {
      return "Derived value cannot be written to graph as first-class fact. Route through user confirmation.";
    }
  }
  return null;
}

// ── Contract violation check ────────────────────────────────────────────────

export function checkViolation(violation: string): { severity: string; response: string } | null {
  const match = CONTRACT_VIOLATIONS.find(v => violation.includes(v.violation));
  if (match) {
    auditLog("ContractViolation", `[${match.severity}] ${violation}: ${match.response}`);
    return { severity: match.severity, response: match.response };
  }
  return null;
}

// ── Main gate ───────────────────────────────────────────────────────────────

export function checkPermission(req: GateRequest): GateOutcome {
  const policy = DEFAULT_POLICY[req.actionClass];
  if (!policy) return { decision: "deny", reason: `Unknown action class: ${req.actionClass}` };

  // 1. Derived-write prohibition
  const derivedBlock = checkDerivedWriteProhibition(req);
  if (derivedBlock) return { decision: "deny", reason: derivedBlock };

  // 2. Cron source restriction
  if (req.source === "cron" && !policy.cronAllowed) {
    return { decision: "deny", reason: `${req.actionClass} not allowed from cron jobs` };
  }

  // 3. Rate limit check
  if (!checkRateLimit(req.actionClass, policy.maxPerHour)) {
    return { decision: "deny", reason: `Rate limit exceeded: ${req.actionClass} (max ${policy.maxPerHour}/hour)` };
  }

  // 4. Get effective trust level (may be upgraded/downgraded from default)
  const effectiveLevel = getTrustLevel(req.actionClass);

  // 5. Apply permission logic
  if (req.source === "user_triggered" && effectiveLevel === "L2_confirm_execute") {
    return auditedAllow(req);
  }

  if (effectiveLevel === "L3_bounded_auto") {
    return auditedAllow(req);
  }

  if (effectiveLevel === "L1_draft") {
    return { decision: "require_confirmation", reason: "Action is draft-only at current trust level", actionClass: req.actionClass };
  }

  if (effectiveLevel === "L0_read_only") {
    return { decision: "deny", reason: "Action not permitted — system is in read-only mode" };
  }

  // L2 from non-user source
  if (effectiveLevel === "L2_confirm_execute" && req.source !== "user_triggered") {
    return { decision: "require_confirmation", reason: "Non-user action requires explicit approval", actionClass: req.actionClass };
  }

  return { decision: "require_confirmation", reason: "Requires user approval", actionClass: req.actionClass };
}

// ── Audit ────────────────────────────────────────────────────────────────────

function auditedAllow(req: GateRequest): GateOutcome {
  const auditId = nanoid();
  if (DEFAULT_POLICY[req.actionClass]?.requiresAudit) {
    auditLog("PermissionGate", `[${req.actionClass}|${req.source}] ${req.description.slice(0, 80)}`);
  }
  return { decision: "allow", auditId };
}

function auditLog(agent: string, action: string): void {
  db.prepare(
    "INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)"
  ).run(nanoid(), DEFAULT_USER_ID, agent, action, "success");
}

// ── Status for admin ────────────────────────────────────────────────────────

export function getPermissionStatus() {
  const policies = Object.values(DEFAULT_POLICY).map(p => ({
    actionClass: p.actionClass,
    defaultLevel: p.defaultLevel,
    effectiveLevel: getTrustLevel(p.actionClass),
    riskTier: p.riskTier,
    maxPerHour: p.maxPerHour,
    cronAllowed: p.cronAllowed,
    trustScore: trustScores.get(p.actionClass) ?? null,
  }));
  return { policies, universalRulesCount: 8, contractViolationTypes: CONTRACT_VIOLATIONS.length };
}
