/**
 * L4 Orchestration — Proactive Intelligence.
 *
 * Detects conditions that warrant user attention and pushes notifications.
 * This is what makes Anchor a COMPANION, not a TOOL.
 *
 * Checks:
 * 1. Relationship decay — someone needs follow-up
 * 2. Upcoming events — meetings tomorrow need prep
 * 3. Overdue tasks — things slipping through cracks
 * 4. Decision outcomes — 48h/7d follow-up on past decisions
 * 5. Attention drift — focus score dropping
 *
 * All notifications go through bus → WebSocket → frontend toast.
 */
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { nanoid } from "nanoid";
import { bus } from "./bus.js";
import { relationshipHealth, healthToStatus } from "../graph/math/decay.js";

export interface ProactiveNotification {
  id: string;
  type: "relationship_decay" | "upcoming_event" | "overdue_task" | "outcome_followup" | "insight";
  title: string;
  body: string;
  action?: {
    label: string;
    type: "send_email" | "create_task" | "navigate" | "confirm";
    payload: Record<string, any>;
  };
  priority: "high" | "medium" | "low";
  createdAt: string;
}

function log(agent: string, action: string, status = "success") {
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, agent, action, status);
}

// ── Check 1: Relationship Decay ────────────────────────────────────────────

function checkRelationshipDecay(): ProactiveNotification[] {
  const notifications: ProactiveNotification[] = [];

  const people = db.prepare(
    "SELECT id, label, detail, updated_at FROM graph_nodes WHERE user_id=? AND type='person' AND status NOT IN ('done','dormant')"
  ).all(DEFAULT_USER_ID) as any[];

  const now = Date.now();
  for (const p of people) {
    const daysSince = (now - new Date(p.updated_at).getTime()) / 86400000;
    const health = relationshipHealth(daysSince, 0);

    // Only notify when crossing the "cooling" threshold (health 0.4-0.5)
    if (health < 0.5 && health > 0.15 && daysSince > 5) {
      notifications.push({
        id: nanoid(),
        type: "relationship_decay",
        title: `${p.label} needs follow-up`,
        body: `${Math.round(daysSince)} days since last contact. Relationship health: ${Math.round(health * 100)}%.`,
        action: {
          label: "Draft follow-up email",
          type: "send_email",
          payload: { personLabel: p.label, context: p.detail },
        },
        priority: health < 0.3 ? "high" : "medium",
        createdAt: new Date().toISOString(),
      });
    }
  }

  return notifications;
}

// ── Check 2: Overdue Tasks ─────────────────────────────────────────────────

function checkOverdueTasks(): ProactiveNotification[] {
  const overdue = db.prepare(
    "SELECT t.id, t.title, t.due_date, t.priority FROM tasks t JOIN projects p ON t.project_id = p.id WHERE p.user_id=? AND t.status NOT IN ('done','blocked') AND t.due_date IS NOT NULL AND t.due_date < date('now')"
  ).all(DEFAULT_USER_ID) as any[];

  return overdue.slice(0, 3).map((t: any) => ({
    id: nanoid(),
    type: "overdue_task" as const,
    title: `Overdue: ${t.title}`,
    body: `Due date was ${t.due_date}. Priority: ${t.priority}.`,
    action: {
      label: "Mark as done",
      type: "confirm" as const,
      payload: { taskId: t.id },
    },
    priority: t.priority === "high" ? "high" as const : "medium" as const,
    createdAt: new Date().toISOString(),
  }));
}

// ── Check 3: Decision Outcome Follow-up (48h / 7d) ────────────────────────

function checkOutcomeFollowups(): ProactiveNotification[] {
  const notifications: ProactiveNotification[] = [];

  // Find decisions confirmed 48h ago that don't have an outcome recorded
  const decisions48h = db.prepare(`
    SELECT gn.id, gn.label, gn.detail, gn.created_at
    FROM graph_nodes gn
    WHERE gn.user_id=? AND gn.type='decision' AND gn.status='active'
    AND julianday('now') - julianday(gn.created_at) BETWEEN 1.5 AND 3
  `).all(DEFAULT_USER_ID) as any[];

  for (const d of decisions48h) {
    // Check if we already asked about this one
    const alreadyAsked = db.prepare(
      "SELECT id FROM agent_executions WHERE user_id=? AND action LIKE ? AND created_at >= datetime('now', '-2 days')"
    ).get(DEFAULT_USER_ID, `%outcome_followup:${d.id}%`);

    if (!alreadyAsked) {
      notifications.push({
        id: nanoid(),
        type: "outcome_followup",
        title: `How did it go?`,
        body: `You decided "${d.label}" 2 days ago. What was the outcome?`,
        action: {
          label: "Give feedback",
          type: "confirm",
          payload: { decisionId: d.id, decisionLabel: d.label },
        },
        priority: "medium",
        createdAt: new Date().toISOString(),
      });
      log("Proactive", `outcome_followup:${d.id}`);
    }
  }

  return notifications;
}

// ── Check 4: Graph Insights ────────────────────────────────────────────────

function checkNewInsights(): ProactiveNotification[] {
  const recentInsights = db.prepare(
    "SELECT insight, confidence FROM twin_insights WHERE user_id=? AND created_at >= datetime('now', '-6 hours') AND confidence > 0.75 ORDER BY confidence DESC LIMIT 2"
  ).all(DEFAULT_USER_ID) as any[];

  return recentInsights.map((i: any) => ({
    id: nanoid(),
    type: "insight" as const,
    title: "New pattern detected",
    body: i.insight.slice(0, 150),
    priority: "low" as const,
    createdAt: new Date().toISOString(),
  }));
}

// ── Master: Run all checks and push via bus ─────────────────────────────────

export function runProactiveChecks(): ProactiveNotification[] {
  const all: ProactiveNotification[] = [
    ...checkRelationshipDecay(),
    ...checkOverdueTasks(),
    ...checkOutcomeFollowups(),
    ...checkNewInsights(),
  ];

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  all.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Push each notification through the bus → WebSocket → frontend
  for (const notification of all.slice(0, 5)) { // max 5 per check
    bus.publish({
      type: "NOTIFICATION",
      payload: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        priority: notification.priority,
        action: notification.action,
      },
    });
  }

  if (all.length > 0) {
    log("Proactive", `${all.length} notifications: ${all.map(n => n.type).join(", ")}`);
  }

  return all;
}
