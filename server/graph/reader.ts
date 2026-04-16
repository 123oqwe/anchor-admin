/**
 * L1 Human Graph — Reader.
 *
 * Read-only queries against the Human Graph.
 * This is the ONLY way L3 Cognition and L4 Orchestration should access graph data.
 * They call these functions, not raw SQL.
 */
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { type NodeType, type EdgeType, type Domain, DOMAIN_META } from "./ontology.js";

export interface NodeRecord {
  id: string;
  domain: string;
  label: string;
  type: string;
  status: string;
  captured: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
}

// ── Core queries ────────────────────────────────────────────────────────────

/** Get all nodes, grouped by domain. */
export function getFullGraph(): { domain: string; name: string; nodes: NodeRecord[] }[] {
  const nodes = db.prepare(
    "SELECT id, domain, label, type, status, captured, detail, created_at as createdAt, updated_at as updatedAt FROM graph_nodes WHERE user_id=? ORDER BY domain, created_at"
  ).all(DEFAULT_USER_ID) as NodeRecord[];

  const grouped: Record<string, NodeRecord[]> = {};
  for (const n of nodes) {
    if (!grouped[n.domain]) grouped[n.domain] = [];
    grouped[n.domain].push(n);
  }

  return Object.entries(grouped).map(([domain, domNodes]) => ({
    domain,
    name: (DOMAIN_META as any)[domain]?.name ?? domain,
    nodes: domNodes,
  }));
}

/** Get nodes filtered by domain. */
export function getNodesByDomain(domain: Domain): NodeRecord[] {
  return db.prepare(
    "SELECT id, domain, label, type, status, captured, detail, created_at as createdAt, updated_at as updatedAt FROM graph_nodes WHERE user_id=? AND domain=? ORDER BY created_at"
  ).all(DEFAULT_USER_ID, domain) as NodeRecord[];
}

/** Get nodes filtered by status. */
export function getNodesByStatus(...statuses: string[]): NodeRecord[] {
  const placeholders = statuses.map(() => "?").join(",");
  return db.prepare(
    `SELECT id, domain, label, type, status, captured, detail, created_at as createdAt, updated_at as updatedAt FROM graph_nodes WHERE user_id=? AND status IN (${placeholders}) ORDER BY created_at`
  ).all(DEFAULT_USER_ID, ...statuses) as NodeRecord[];
}

/** Get nodes filtered by type. */
export function getNodesByType(type: NodeType): NodeRecord[] {
  return db.prepare(
    "SELECT id, domain, label, type, status, captured, detail, created_at as createdAt, updated_at as updatedAt FROM graph_nodes WHERE user_id=? AND type=? ORDER BY created_at"
  ).all(DEFAULT_USER_ID, type) as NodeRecord[];
}

/** Find the highest-priority urgent node. */
export function getMostUrgentNode(): NodeRecord | null {
  return (db.prepare(
    "SELECT id, domain, label, type, status, captured, detail, created_at as createdAt, updated_at as updatedAt FROM graph_nodes WHERE user_id=? AND status IN ('overdue','delayed','decaying') ORDER BY CASE status WHEN 'overdue' THEN 1 WHEN 'delayed' THEN 2 WHEN 'decaying' THEN 3 END, created_at LIMIT 1"
  ).get(DEFAULT_USER_ID) as NodeRecord) ?? null;
}

// ── Context serialization (for L3 Cognition prompt injection) ───────────────

/** Serialize graph into a text block that can be injected into an LLM system prompt. */
export function serializeForPrompt(): string {
  const domains = getFullGraph();
  if (domains.length === 0) return "No Human Graph data yet.";
  return domains.map(d =>
    `${d.name.toUpperCase()}:\n${d.nodes.map(n => `  - [${n.type}] ${n.label} (${n.status}): ${n.detail}`).join("\n")}`
  ).join("\n\n");
}

/** Serialize user state for prompt injection. */
export function serializeStateForPrompt(): string {
  const s = db.prepare("SELECT energy, focus, stress FROM user_state WHERE user_id=?").get(DEFAULT_USER_ID) as any;
  if (!s) return "";
  return `Current state — Energy: ${s.energy}/100, Focus: ${s.focus}/100, Stress: ${s.stress}/100`;
}
