/**
 * L5 Execution — Execution Agent.
 * ReAct loop: think → act (call tool) → observe → repeat → record outcome.
 * Note: L6 Permission Gate will wrap this in the future.
 */
import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { bus, type EditableStep } from "../orchestration/bus.js";
import { routeTask } from "../infra/compute/router.js";
import { INTERNAL_TOOLS, executeTool } from "./tools.js";

function log(agent: string, action: string, status = "success") {
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, agent, action, status);
}

export async function runExecutionReAct(steps: EditableStep[]) {
  console.log(`[Execution Agent] ReAct starting with ${steps.length} steps...`);
  log("Execution Agent", `ReAct: ${steps.length} steps`);

  const { model: routedModel } = routeTask("react_execution");
  const modelId = routedModel.id;
  console.log(`[Cortex] react_execution → ${routedModel.name} (${routedModel.provider})`);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Convert INTERNAL_TOOLS to Anthropic tool format
  const tools: Anthropic.Messages.Tool[] = INTERNAL_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  const stepsText = steps.map(s => `Step ${s.id}: ${s.content}${s.time_estimate ? ` (est: ${s.time_estimate})` : ""}`).join("\n");
  const stepsResult: { step: string; status: string; result: string }[] = [];
  const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: `Execute this plan:\n${stepsText}` }];

  try {
    for (let turn = 0; turn < 10; turn++) {
      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: "You are Anchor's Execution Agent. Execute each step using the available tools. After all steps, call record_outcome with a summary.",
        tools,
        messages,
      });

      messages.push({ role: "assistant", content: response.content });
      const toolUses = response.content.filter((b: any) => b.type === "tool_use") as Anthropic.Messages.ToolUseBlock[];
      if (toolUses.length === 0) break;

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const result = executeTool(tu.name, tu.input);
        stepsResult.push({ step: tu.name, status: "done", result });
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result });
      }
      messages.push({ role: "user", content: toolResults });
      if (response.stop_reason === "end_turn") break;
    }

    log("Execution Agent", `ReAct done: ${stepsResult.length} tool calls`);
    console.log(`[Execution Agent] ReAct done. ${stepsResult.length} actions.`);

    bus.publish({
      type: "EXECUTION_DONE",
      payload: { steps_result: stepsResult, plan_summary: steps.map(s => s.content).join("; ") },
    });
  } catch (err: any) {
    console.error("[Execution Agent] ReAct error:", err.message);
    log("Execution Agent", `ReAct failed: ${err.message}`, "failed");
  }
}
