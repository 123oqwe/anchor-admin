/**
 * L3 Cognition — GEPA-inspired Execution Trace Optimizer.
 *
 * Analyzes HOW tasks were executed (not just IF they succeeded).
 * Finds inefficiencies and auto-adjusts Decision Agent behavior.
 *
 * Inspired by: Hermes Agent GEPA (ICLR 2026 Oral)
 * "Generic Evolution of Prompt Architectures"
 *
 * Anchor's version: reads llm_calls + agent_executions traces,
 * detects waste patterns, generates optimization suggestions.
 *
 * Runs weekly (alongside System Evolution) or on-demand.
 */
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { nanoid } from "nanoid";
import { text } from "../infra/compute/index.js";

export interface TraceAnalysis {
  totalCalls: number;
  totalTokens: number;
  wastePatterns: WastePattern[];
  optimizations: Optimization[];
  efficiency: number; // 0-100
}

export interface WastePattern {
  type: "redundant_calls" | "excessive_tokens" | "failed_retries" | "unnecessary_swarm" | "slow_extraction";
  description: string;
  impact: string;
  count: number;
}

export interface Optimization {
  target: string; // which prompt/task to optimize
  suggestion: string;
  estimatedSaving: string;
  autoApplicable: boolean;
}

// ── Analyze execution traces ────────────────────────────────────────────────

export async function analyzeExecutionTraces(daysBack = 7): Promise<TraceAnalysis> {
  // Gather all LLM calls from the period
  const calls = db.prepare(`
    SELECT task, model_id, input_tokens, output_tokens, latency_ms, status, error
    FROM llm_calls
    WHERE created_at >= datetime('now', '-${daysBack} days')
    ORDER BY created_at
  `).all() as any[];

  const executions = db.prepare(`
    SELECT agent, action, status, created_at
    FROM agent_executions
    WHERE user_id=? AND created_at >= datetime('now', '-${daysBack} days')
    ORDER BY created_at
  `).all(DEFAULT_USER_ID) as any[];

  const totalCalls = calls.length;
  const totalTokens = calls.reduce((s: number, c: any) => s + (c.input_tokens ?? 0) + (c.output_tokens ?? 0), 0);

  if (totalCalls < 5) {
    return { totalCalls, totalTokens, wastePatterns: [], optimizations: [], efficiency: 100 };
  }

  const wastePatterns: WastePattern[] = [];

  // Pattern 1: Failed calls that were retried
  const failedCalls = calls.filter((c: any) => c.status === "failed");
  if (failedCalls.length > 3) {
    wastePatterns.push({
      type: "failed_retries",
      description: `${failedCalls.length} LLM calls failed in the last ${daysBack} days`,
      impact: `Wasted ${failedCalls.reduce((s: number, c: any) => s + (c.input_tokens ?? 0), 0)} input tokens on failures`,
      count: failedCalls.length,
    });
  }

  // Pattern 2: Excessive tokens per task
  const taskTokens = new Map<string, { calls: number; tokens: number }>();
  for (const c of calls) {
    const entry = taskTokens.get(c.task) ?? { calls: 0, tokens: 0 };
    entry.calls++;
    entry.tokens += (c.input_tokens ?? 0) + (c.output_tokens ?? 0);
    taskTokens.set(c.task, entry);
  }

  taskTokens.forEach((data, task) => {
    const avgTokensPerCall = data.tokens / data.calls;
    if (avgTokensPerCall > 3000 && data.calls > 3) {
      wastePatterns.push({
        type: "excessive_tokens",
        description: `Task "${task}" averages ${Math.round(avgTokensPerCall)} tokens/call`,
        impact: `Consider reducing context injection for this task type`,
        count: data.calls,
      });
    }
  });

  // Pattern 3: Graph extraction called too often
  const extractionCalls = calls.filter((c: any) => c.task === "graph_extraction");
  if (extractionCalls.length > 20) {
    wastePatterns.push({
      type: "slow_extraction",
      description: `${extractionCalls.length} graph extractions in ${daysBack} days`,
      impact: `Each extraction costs ~1200 tokens. Consider batching or caching.`,
      count: extractionCalls.length,
    });
  }

  // Pattern 4: Swarm activated but not needed (high confidence decisions that used swarm)
  const swarmExecutions = executions.filter((e: any) => e.action?.includes("Swarm"));
  if (swarmExecutions.length > 5) {
    wastePatterns.push({
      type: "unnecessary_swarm",
      description: `Cognitive Swarm activated ${swarmExecutions.length} times`,
      impact: `Each swarm = 3 extra LLM calls. Tighten activation threshold.`,
      count: swarmExecutions.length,
    });
  }

  // Generate optimizations using LLM (1 cheap call)
  let optimizations: Optimization[] = [];
  try {
    const tracesSummary = `LLM calls: ${totalCalls} (${totalTokens} tokens). Failed: ${failedCalls.length}. Tasks: ${Array.from(taskTokens.entries()).map(([t, d]) => `${t}(${d.calls}calls/${d.tokens}tok)`).join(", ")}. Waste patterns: ${wastePatterns.map(w => w.description).join("; ")}`;

    const result = await text({
      task: "twin_edit_learning",
      system: `You analyze AI agent execution traces and suggest optimizations. Respond ONLY with JSON: {"optimizations": [{"target": "task_name", "suggestion": "what to change", "estimatedSaving": "30% fewer tokens", "autoApplicable": true}]}`,
      messages: [{ role: "user", content: tracesSummary }],
      maxTokens: 300,
    });

    const parsed = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    if (Array.isArray(parsed.optimizations)) {
      optimizations = parsed.optimizations;
    }
  } catch {}

  const efficiency = Math.max(0, 100 - wastePatterns.length * 15 - Math.round(failedCalls.length / totalCalls * 100));

  // Log the analysis
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, "GEPA Optimizer", `Analyzed ${totalCalls} calls: ${wastePatterns.length} waste patterns, ${optimizations.length} optimizations`, "success");

  return { totalCalls, totalTokens, wastePatterns, optimizations, efficiency };
}
