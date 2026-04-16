/**
 * L6 Permission & Trust — Pre-execution gate.
 * Every side-effecting action passes through checkPermission() before L5 runs.
 * Returns an outcome: allow / require_confirmation / deny.
 */
import { DEFAULT_POLICY, type ActionClass, type PermissionLevel } from "./levels.js";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { nanoid } from "nanoid";

export type GateOutcome =
  | { decision: "allow"; auditId: string }
  | { decision: "require_confirmation"; reason: string; actionClass: ActionClass }
  | { decision: "deny"; reason: string };

export interface GateRequest {
  actionClass: ActionClass;
  description: string;         // human-readable preview of what will happen
  source: "user_triggered" | "cron" | "agent_chain";
  metadata?: Record<string, any>;
}

/** Check if a proposed action passes the permission gate. */
export function checkPermission(req: GateRequest): GateOutcome {
  const policy = DEFAULT_POLICY[req.actionClass];
  if (!policy) return { decision: "deny", reason: `Unknown action class: ${req.actionClass}` };

  // User-triggered + L2 means already confirmed at the API layer (USER_CONFIRMED event)
  if (req.source === "user_triggered" && policy.defaultLevel === "L2_confirm_execute") {
    return auditedAllow(req);
  }

  // L3 bounded auto — allow freely but audit
  if (policy.defaultLevel === "L3_bounded_auto") {
    return auditedAllow(req);
  }

  // L1 draft — system cannot execute, must produce a draft for user
  if (policy.defaultLevel === "L1_draft") {
    return { decision: "require_confirmation", reason: "Action is draft-only", actionClass: req.actionClass };
  }

  // L0 read-only — no side effects allowed
  if (policy.defaultLevel === "L0_read_only") {
    return { decision: "deny", reason: "Action not permitted at current trust level" };
  }

  // Default: require confirmation
  return { decision: "require_confirmation", reason: "Requires explicit user approval", actionClass: req.actionClass };
}

function auditedAllow(req: GateRequest): GateOutcome {
  const auditId = nanoid();
  const policy = DEFAULT_POLICY[req.actionClass];
  if (policy.requiresAudit) {
    db.prepare(
      "INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)"
    ).run(auditId, DEFAULT_USER_ID, "PermissionGate", `[${req.actionClass}|${req.source}] ${req.description.slice(0, 80)}`, "success");
  }
  return { decision: "allow", auditId };
}
