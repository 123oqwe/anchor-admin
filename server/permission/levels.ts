/**
 * L6 Permission & Trust — Authority levels.
 * Defines how much autonomy the system has for different action classes.
 */

export type PermissionLevel =
  | "L0_read_only"       // System can only read, never write anywhere
  | "L1_draft"           // System can produce suggestions but not apply them
  | "L2_confirm_execute" // System requires user confirmation before any side effect
  | "L3_bounded_auto";   // System can execute within pre-approved scope

export type ActionClass =
  | "read_graph"         // Reading Human Graph
  | "read_memory"        // Reading memories
  | "write_memory"       // Writing to memories (episodic/semantic)
  | "write_graph"        // Modifying Human Graph nodes
  | "write_task"         // Creating workspace tasks
  | "send_external"      // Sending external communications (email, SMS, Slack)
  | "modify_calendar"    // Creating/modifying calendar events
  | "financial"          // Any money-moving action
  | "admin_config";      // Changing provider keys, overrides, etc.

export interface ActionPolicy {
  actionClass: ActionClass;
  defaultLevel: PermissionLevel;
  requiresAudit: boolean;
  riskTier: "low" | "medium" | "high" | "critical";
}

/** Default policy — conservative. User can upgrade per-class via settings. */
export const DEFAULT_POLICY: Record<ActionClass, ActionPolicy> = {
  read_graph:      { actionClass: "read_graph",      defaultLevel: "L3_bounded_auto",   requiresAudit: false, riskTier: "low" },
  read_memory:     { actionClass: "read_memory",     defaultLevel: "L3_bounded_auto",   requiresAudit: false, riskTier: "low" },
  write_memory:    { actionClass: "write_memory",    defaultLevel: "L3_bounded_auto",   requiresAudit: true,  riskTier: "low" },
  write_graph:     { actionClass: "write_graph",     defaultLevel: "L2_confirm_execute",requiresAudit: true,  riskTier: "medium" },
  write_task:      { actionClass: "write_task",      defaultLevel: "L2_confirm_execute",requiresAudit: true,  riskTier: "low" },
  send_external:   { actionClass: "send_external",   defaultLevel: "L2_confirm_execute",requiresAudit: true,  riskTier: "high" },
  modify_calendar: { actionClass: "modify_calendar", defaultLevel: "L2_confirm_execute",requiresAudit: true,  riskTier: "medium" },
  financial:       { actionClass: "financial",       defaultLevel: "L1_draft",          requiresAudit: true,  riskTier: "critical" },
  admin_config:    { actionClass: "admin_config",    defaultLevel: "L2_confirm_execute",requiresAudit: true,  riskTier: "high" },
};
