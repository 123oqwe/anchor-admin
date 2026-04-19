/**
 * L3 Cognition — Memory Agent + Observation Agent.
 * - Memory Agent: persists Twin insights as semantic memory.
 * - Observation Agent: records graph changes as episodic memory + cascades unlocks.
 *
 * Uses L1 Graph (writer) and L2 Memory (retrieval) — no raw DB.
 */
import { db, DEFAULT_USER_ID, logExecution } from "../infra/storage/db.js";
import { writeMemory } from "../memory/retrieval.js";
import { unlockBlockedNodes } from "../graph/writer.js";

export function persistInsightAsSemanticMemory(insight: string) {
  // Use first phrase of insight as title to avoid duplicate generic titles
  const shortTitle = `Twin: ${insight.split(/[.!,;]/)[0].trim()}`.slice(0, 60);
  writeMemory({
    type: "semantic",
    title: shortTitle,
    content: insight,
    tags: ["twin", "auto-generated"],
    source: "Twin Agent",
    confidence: 0.75,
  });
  logExecution("Memory Agent", "Semantic memory stored");
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
  logExecution("Observation Agent", `Graph: "${label}" → ${status}${unblocked > 0 ? `, ${unblocked} unblocked` : ""}`);
}

export function grantTaskCompletionXp(title: string) {
  const evo = db.prepare("SELECT xp, level FROM twin_evolution WHERE user_id=?").get(DEFAULT_USER_ID) as any;
  if (!evo) return;
  const newXp = evo.xp + 5;
  db.prepare("UPDATE twin_evolution SET xp=?, level=?, updated_at=datetime('now') WHERE user_id=?")
    .run(newXp, Math.min(4, Math.floor(newXp / 100) + 1), DEFAULT_USER_ID);
  logExecution("Twin Agent", `+5 XP: "${title.slice(0, 40)}"`);
}
