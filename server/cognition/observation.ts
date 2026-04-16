/**
 * L3 Cognition — Memory Agent + Observation Agent.
 * - Memory Agent: persists Twin insights as semantic memory.
 * - Observation Agent: records graph changes as episodic memory + cascades unlocks.
 */
import { nanoid } from "nanoid";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";

function log(agent: string, action: string, status = "success") {
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, agent, action, status);
}

export function persistInsightAsSemanticMemory(insight: string) {
  db.prepare("INSERT INTO memories (id, user_id, type, title, content, tags, source, confidence) VALUES (?,?,?,?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, "semantic", "Behavioral Pattern Detected", insight, JSON.stringify(["twin", "auto-generated"]), "Twin Agent", 0.75);
  log("Memory Agent", "Semantic memory stored");
}

export function recordGraphChange(nodeId: string, status: string, label: string) {
  db.prepare("INSERT INTO memories (id, user_id, type, title, content, tags, source, confidence) VALUES (?,?,?,?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, "episodic", `Graph change: ${label}`, `${new Date().toLocaleDateString("zh-CN")}: "${label}" → ${status}.`, JSON.stringify(["graph", "auto"]), "Observation Agent", 0.95);
  db.prepare("UPDATE graph_nodes SET status='todo', updated_at=datetime('now') WHERE user_id=? AND status='blocked'").run(DEFAULT_USER_ID);
  log("Observation Agent", `Graph: "${label}" → ${status}`);
}

export function grantTaskCompletionXp(title: string) {
  const evo = db.prepare("SELECT xp, level FROM twin_evolution WHERE user_id=?").get(DEFAULT_USER_ID) as any;
  if (!evo) return;
  const newXp = evo.xp + 5;
  db.prepare("UPDATE twin_evolution SET xp=?, level=?, updated_at=datetime('now') WHERE user_id=?")
    .run(newXp, Math.min(4, Math.floor(newXp / 100) + 1), DEFAULT_USER_ID);
  log("Twin Agent", `+5 XP: "${title.slice(0, 40)}"`);
}
