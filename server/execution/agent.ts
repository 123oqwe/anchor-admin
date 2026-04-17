/**
 * L5 Execution — Execution Agent (ReAct loop with checkpoints).
 *
 * Patterns used:
 * - Anthropic tool_use agent loop (stateless, iteration-capped)
 * - Checkpoint-based recovery (save state per step)
 * - Tool composition (previous results injected as context)
 * - Structured error classification (success / error / retry / skip)
 * - Per-tool execution logging with input/output/latency
 * - Unified tool interface via registry
 */
import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { bus, type EditableStep } from "../orchestration/bus.js";
import { routeTask } from "../infra/compute/router.js";
import { getApiKey } from "../infra/compute/keys.js";
import { getAllTools, executeTool, getToolsForLLM, type ToolResult, type ExecutionContext } from "./registry.js";

function log(agent: string, action: string, status = "success") {
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, agent, action, status);
}

// ── Checkpoint ──────────────────────────────────────────────────────────────

interface Checkpoint {
  stepIndex: number;
  toolName: string;
  input: any;
  result: ToolResult;
  timestamp: string;
}

// ── Main ReAct execution ────────────────────────────────────────────────────

export async function runExecutionReAct(steps: EditableStep[]) {
  console.log(`[Execution Agent] ReAct starting with ${steps.length} steps...`);
  log("Execution Agent", `ReAct: ${steps.length} steps`);

  const { model: routedModel } = routeTask("react_execution");
  const modelId = routedModel.id;
  console.log(`[Execution] react_execution → ${routedModel.name} (${routedModel.provider})`);

  const apiKey = getApiKey(routedModel.provider);
  if (!apiKey) {
    log("Execution Agent", "No API key for execution model", "failed");
    bus.publish({ type: "EXECUTION_DONE", payload: { steps_result: [], plan_summary: steps.map(s => s.content).join("; ") } });
    return;
  }

  const anthropic = new Anthropic({ apiKey });

  // Build tool list from registry
  const toolDefs = getToolsForLLM();

  const stepsText = steps.map(s => `Step ${s.id}: ${s.content}${s.time_estimate ? ` (est: ${s.time_estimate})` : ""}`).join("\n");
  const stepsResult: { step: string; status: string; result: string; input?: any; latencyMs?: number }[] = [];
  const checkpoints: Checkpoint[] = [];
  const messages: Anthropic.Messages.MessageParam[] = [{
    role: "user",
    content: `Execute this plan step by step. Use one tool per step. After all steps, call record_outcome with a summary of what was accomplished.\n\nPlan:\n${stepsText}`,
  }];

  const MAX_TURNS = 12;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: `You are Anchor's Execution Agent. Execute each plan step using the available tools.

RULES:
1. Use exactly ONE tool per plan step.
2. After executing all steps, call record_outcome with a summary.
3. If a tool returns an error, note it and continue to the next step.
4. Do not skip steps — attempt each one.

Available tools: ${toolDefs.map(t => t.name).join(", ")}`,
        tools: toolDefs as any,
        messages,
      });

      messages.push({ role: "assistant", content: response.content });
      const toolUses = response.content.filter((b: any) => b.type === "tool_use") as Anthropic.Messages.ToolUseBlock[];

      if (toolUses.length === 0) break;

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        // Build execution context (tool composition)
        const context: ExecutionContext = {
          previousResults: stepsResult.map(r => ({ toolName: r.step, output: r.result, data: undefined })),
          stepIndex: stepsResult.length,
          totalSteps: steps.length,
        };

        // Execute via registry (includes L6 gate + logging)
        const start = Date.now();
        const result = await executeTool(tu.name, tu.input, context, "user_triggered");
        const latency = Date.now() - start;

        // Checkpoint
        checkpoints.push({
          stepIndex: stepsResult.length,
          toolName: tu.name,
          input: tu.input,
          result,
          timestamp: new Date().toISOString(),
        });

        stepsResult.push({
          step: tu.name,
          status: result.success ? "done" : "error",
          result: result.output,
          input: tu.input,
          latencyMs: latency,
        });

        // Return result to LLM (mark errors so LLM adapts)
        const resultContent = result.success
          ? result.output
          : `ERROR: ${result.output}${result.shouldRetry ? " (retryable)" : ""}`;

        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: resultContent,
          ...(result.success ? {} : { is_error: true } as any),
        });
      }

      messages.push({ role: "user", content: toolResults });
      if (response.stop_reason === "end_turn") break;
    }

    const successCount = stepsResult.filter(r => r.status === "done").length;
    const errorCount = stepsResult.filter(r => r.status === "error").length;
    log("Execution Agent", `ReAct done: ${successCount} success, ${errorCount} errors, ${stepsResult.length} total`);
    console.log(`[Execution Agent] ReAct done. ${successCount}/${stepsResult.length} successful.`);

    bus.publish({
      type: "EXECUTION_DONE",
      payload: {
        steps_result: stepsResult,
        plan_summary: steps.map(s => s.content).join("; "),
      },
    });
  } catch (err: any) {
    console.error("[Execution Agent] ReAct error:", err.message);
    log("Execution Agent", `ReAct failed: ${err.message}`, "failed");

    // Emit partial results even on failure
    if (stepsResult.length > 0) {
      bus.publish({
        type: "EXECUTION_DONE",
        payload: {
          steps_result: stepsResult,
          plan_summary: steps.map(s => s.content).join("; ") + " (partial — error during execution)",
        },
      });
    }
  }
}
