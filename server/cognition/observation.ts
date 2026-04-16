/**
 * L3 Cognition — Memory Agent + Observation Agent.
 * - Memory Agent: persists Twin insights as semantic memory.
 * - Observation Agent: records graph changes as episodic memory + cascades unlocks.
 *
 * Uses L1 Graph (writer) and L2 Memory (retrieval) — no raw DB.
 */
import { nanoid } from "nanoid";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { writeMemory } from "../memory/retrieval.js";
import { unlockBlockedNodes } from "../graph/writer.js";

function log(agent: string, action: string, status = "success") {
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, agent, action, status);
}

export function persistInsightAsSemanticMemory(insight: string) {
  writeMemory({
    type: "semantic",
    title: "Behavioral Pattern Detected",
    content: insight,
    tags: ["twin", "auto-generated"],
    source: "Twin Agent",
    confidence: 0.75,
  });
  log("Memory Agent", "Semantic memory stored");
}

export function recordGraphChange(nodeId: string, status: string, label: string) {
  writeMemory({
    type: "episodic",
    title: `Graph change: ${label}`,
    content: `${new Date().toLocaleDateString("zh-CN")}: "${label}" → ${status}.`,
    tags: ["graph", "auto"],
    source: "Observation Agent",
    confidence: 0.95,
  });
  const unblocked = unlockBlockedNodes();
  log("Observation Agent", `Graph: "${label}" → ${status}${unblocked > 0 ? `, ${unblocked} unblocked` : ""}`);
}

export function grantTaskCompletionXp(title: string) {
  const evo = db.prepare("SELECT xp, level FROM twin_evolution WHERE user_id=?").get(DEFAULT_USER_ID) as any;
  if (!evo) return;
  const newXp = evo.xp + 5;
  db.prepare("UPDATE twin_evolution SET xp=?, level=?, updated_at=datetime('now') WHERE user_id=?")
    .run(newXp, Math.min(4, Math.floor(newXp / 100) + 1), DEFAULT_USER_ID);
  log("Twin Agent", `+5 XP: "${title.slice(0, 40)}"`);
}
