/**
 * L4 Orchestration — Master Orchestrator Modes.
 *
 * From spec: master-orchestrator.ts — 5 orchestration modes.
 * The Orchestrator is the SOLE control center. No other component
 * may invoke components or route outputs.
 *
 * Modes:
 *   1. direct_decision — standard user input → Decision Agent
 *   2. twin_refresh    — reflection/drift → update Twin priors
 *   3. planning        — complex multi-step → Swarm debate
 *   4. reflection      — outcome feedback → Twin + optionally Decision
 *   5. approval_resolution — user approved/rejected → route downstream
 */
import { type AnchorEvent } from "./bus.js";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";

// ── Trigger types ───────────────────────────────────────────────────────────

export type TriggerType =
  | "USER_INPUT"          // user sent a message
  | "USER_CONFIRM"        // user confirmed a plan
  | "USER_REJECT"         // user rejected a plan
  | "SCHEDULED"           // cron job
  | "STATE_CHANGE"        // user state changed (energy/focus/stress)
  | "EXECUTION_COMPLETE"  // execution finished
  | "REFLECTION";         // periodic reflection trigger

export type OrchestratorMode =
  | "direct_decision"
  | "twin_refresh"
  | "planning"
  | "reflection"
  | "approval_resolution";

// ── Mode selection logic ────────────────────────────────────────────────────

export function selectMode(trigger: TriggerType, context?: {
  complexity?: number;
  lastTwinRefresh?: string;
  hasRecentDrift?: boolean;
}): OrchestratorMode {
  switch (trigger) {
    case "USER_INPUT":
      // Check if Twin needs refresh (stale priors)
      if (context?.hasRecentDrift) return "twin_refresh";
      return "direct_decision";

    case "USER_CONFIRM":
      return "approval_resolution";

    case "USER_REJECT":
      return "reflection"; // learn from rejection

    case "SCHEDULED":
      return "reflection";

    case "STATE_CHANGE":
      return "direct_decision"; // re-evaluate priorities

    case "EXECUTION_COMPLETE":
      return "reflection"; // learn from outcome

    case "REFLECTION":
      return "twin_refresh";

    default:
      return "direct_decision";
  }
}

// ── Classify trigger from raw input ─────────────────────────────────────────

export function classifyTrigger(source: string, payload?: any): TriggerType {
  if (source === "advisor_personal" || source === "advisor_general") return "USER_INPUT";
  if (source === "confirm") return "USER_CONFIRM";
  if (source === "reject") return "USER_REJECT";
  if (source === "cron") return "SCHEDULED";
  if (source === "state_update") return "STATE_CHANGE";
  if (source === "execution_done") return "EXECUTION_COMPLETE";
  if (source === "reflection") return "REFLECTION";
  return "USER_INPUT";
}

// ── Operation class (determines if action has side effects) ─────────────────

export type OperationClass =
  | "speculative"     // no side effects, just reading/thinking
  | "analytical"      // read-only analysis
  | "draft"           // produces proposal, no mutation
  | "state_mutation"; // writes to graph/memory/tasks

export function classifyOperation(mode: OrchestratorMode): OperationClass {
  switch (mode) {
    case "direct_decision":     return "draft";         // produces plan for user approval
    case "twin_refresh":        return "analytical";    // updates priors, no external effect
    case "planning":            return "draft";         // produces plan candidates
    case "reflection":          return "analytical";    // learns from outcomes
    case "approval_resolution": return "state_mutation"; // executes approved plan
    default:                    return "speculative";
  }
}

// ── Mode execution log ──────────────────────────────────────────────────────

export function logModeSelection(trigger: TriggerType, mode: OrchestratorMode, opClass: OperationClass) {
  console.log(`[Orchestrator] trigger=${trigger} → mode=${mode} (${opClass})`);
}
