/**
 * L2 Memory & Retrieval — Retrieval contracts.
 *
 * Decides WHAT memories to surface WHEN, for each context.
 * This is what L3 Cognition calls to get relevant context.
 */
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { type MemoryClass } from "./classes.js";

export interface MemoryRecord {
  id: string;
  type: MemoryClass;
  title: string;
  content: string;
  tags: string[];
  source: string;
  confidence: number;
  createdAt: string;
}

// ── Core retrieval functions ────────────────────────────────────────────────

/** Get memories for Decision Agent context — recent + high confidence. */
export function getForDecision(limit = 10): MemoryRecord[] {
  const rows = db.prepare(
    "SELECT id, type, title, content, tags, source, confidence, created_at as createdAt FROM memories WHERE user_id=? ORDER BY created_at DESC LIMIT ?"
  ).all(DEFAULT_USER_ID, limit) as any[];

  return rows.map(r => ({ ...r, tags: safeParseTags(r.tags) }));
}

/** Get Twin insights — behavioral priors for Decision Agent. */
export function getTwinPriors(): { category: string; insight: string; confidence: number }[] {
  return db.prepare(
    "SELECT category, insight, confidence FROM twin_insights WHERE user_id=? ORDER BY confidence DESC"
  ).all(DEFAULT_USER_ID) as any[];
}

/** Get memories by type. */
export function getByClass(memClass: MemoryClass, limit = 50): MemoryRecord[] {
  const rows = db.prepare(
    "SELECT id, type, title, content, tags, source, confidence, created_at as createdAt FROM memories WHERE user_id=? AND type=? ORDER BY created_at DESC LIMIT ?"
  ).all(DEFAULT_USER_ID, memClass, limit) as any[];

  return rows.map(r => ({ ...r, tags: safeParseTags(r.tags) }));
}

/** Search memories by content (keyword match — to be replaced by vector search in L8). */
export function searchMemories(query: string, limit = 20): MemoryRecord[] {
  const rows = db.prepare(
    "SELECT id, type, title, content, tags, source, confidence, created_at as createdAt FROM memories WHERE user_id=? AND (content LIKE ? OR title LIKE ?) ORDER BY created_at DESC LIMIT ?"
  ).all(DEFAULT_USER_ID, `%${query}%`, `%${query}%`, limit) as any[];

  return rows.map(r => ({ ...r, tags: safeParseTags(r.tags) }));
}

/** Get memory stats by class. */
export function getStats(): Record<MemoryClass, number> {
  const rows = db.prepare(
    "SELECT type, COUNT(*) as count FROM memories WHERE user_id=? GROUP BY type"
  ).all(DEFAULT_USER_ID) as any[];

  const stats: Record<string, number> = { working: 0, episodic: 0, semantic: 0 };
  for (const r of rows) stats[r.type] = r.count;
  return stats as Record<MemoryClass, number>;
}

// ── Context serialization (for L3 Cognition prompt injection) ───────────────

/** Serialize memories into a text block for LLM system prompt. */
export function serializeForPrompt(limit = 10): string {
  const mems = getForDecision(limit);
  if (mems.length === 0) return "No memory data yet.";
  return mems.map(m => `[${m.type}] ${m.title}: ${m.content}`).join("\n");
}

/** Serialize Twin priors for prompt injection. */
export function serializeTwinForPrompt(): string {
  const priors = getTwinPriors();
  if (priors.length === 0) return "No behavioral insights yet.";
  return priors.map(p => `${p.category} (${Math.round(p.confidence * 100)}% confidence): ${p.insight}`).join("\n");
}

// ── Write operations ────────────────────────────────────────────────────────

import { nanoid } from "nanoid";

export function writeMemory(opts: {
  type: MemoryClass;
  title: string;
  content: string;
  tags: string[];
  source: string;
  confidence: number;
}): string {
  const id = nanoid();
  db.prepare(
    "INSERT INTO memories (id, user_id, type, title, content, tags, source, confidence) VALUES (?,?,?,?,?,?,?,?)"
  ).run(id, DEFAULT_USER_ID, opts.type, opts.title, opts.content, JSON.stringify(opts.tags), opts.source, opts.confidence);
  return id;
}

export function writeTwinInsight(opts: { category: string; insight: string; confidence: number }): string {
  const id = nanoid();
  db.prepare(
    "INSERT INTO twin_insights (id, user_id, category, insight, confidence) VALUES (?,?,?,?,?)"
  ).run(id, DEFAULT_USER_ID, opts.category, opts.insight, opts.confidence);
  return id;
}

function safeParseTags(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}
