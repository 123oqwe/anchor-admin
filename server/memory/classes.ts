/**
 * L2 Memory & Retrieval — Memory classes and write rules.
 *
 * Defines what kinds of memory exist, when to write, when to promote.
 * This is the "memory semantics" layer — not storage, but policy.
 */

// ── Memory types ────────────────────────────────────────────────────────────

export type MemoryClass = "working" | "episodic" | "semantic";

export interface MemoryMeta {
  description: string;
  ttlDays: number | null;     // null = permanent
  promotable: boolean;        // can be promoted to a higher class?
  promoteTo?: MemoryClass;
}

export const MEMORY_CLASSES: Record<MemoryClass, MemoryMeta> = {
  working: {
    description: "Active short-term context — current tasks, focus areas, today's priorities",
    ttlDays: 7,
    promotable: true,
    promoteTo: "episodic",
  },
  episodic: {
    description: "Specific events, meetings, conversations, decisions, execution outcomes",
    ttlDays: null,
    promotable: true,
    promoteTo: "semantic",
  },
  semantic: {
    description: "Long-term learned knowledge — patterns, preferences, stable truths about the user",
    ttlDays: null,
    promotable: false,
  },
};

// ── Write rules — what triggers memory creation ─────────────────────────────

export interface WriteRule {
  trigger: string;
  memoryClass: MemoryClass;
  source: string;
  confidenceDefault: number;
}

export const WRITE_RULES: WriteRule[] = [
  // Working memory
  { trigger: "morning_digest",         memoryClass: "working",  source: "Observation Agent", confidenceDefault: 0.9 },
  { trigger: "user_state_change",      memoryClass: "working",  source: "User",              confidenceDefault: 1.0 },

  // Episodic memory
  { trigger: "execution_outcome",      memoryClass: "episodic", source: "Execution Agent",   confidenceDefault: 0.9 },
  { trigger: "graph_node_change",      memoryClass: "episodic", source: "Observation Agent",  confidenceDefault: 0.95 },
  { trigger: "user_conversation",      memoryClass: "episodic", source: "Decision Agent",     confidenceDefault: 0.8 },
  { trigger: "plan_confirmed",         memoryClass: "episodic", source: "Decision Agent",     confidenceDefault: 0.9 },

  // Semantic memory (high-value, long-term)
  { trigger: "twin_insight",           memoryClass: "semantic", source: "Twin Agent",         confidenceDefault: 0.75 },
  { trigger: "user_explicit_feedback", memoryClass: "semantic", source: "User",              confidenceDefault: 1.0 },
  { trigger: "repeated_pattern",       memoryClass: "semantic", source: "Twin Agent",         confidenceDefault: 0.85 },
];
