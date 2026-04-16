/**
 * Unified LLM Layer — single interface for all providers.
 */

import { generateText, stepCountIs, type ModelMessage, type ToolSet, type GenerateTextResult } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { type TaskType, ROUTING_TABLE, TIER_PREFERENCES, hasKey } from "./router.js";
import { db, DEFAULT_USER_ID } from "./db.js";
import { nanoid } from "nanoid";

// ── Provider instances ──────────────────────────────────────────────────────

function getProvider(modelId: string) {
  if (modelId.startsWith("claude-")) {
    return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })(modelId);
  }
  if (modelId.startsWith("gpt-")) {
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })(modelId);
  }
  if (modelId.startsWith("deepseek-")) {
    return createOpenAI({ apiKey: process.env.DEEPSEEK_API_KEY!, baseURL: "https://api.deepseek.com/v1" })(modelId);
  }
  if (modelId.startsWith("qwen-")) {
    return createOpenAI({ apiKey: process.env.QWEN_API_KEY!, baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1" })(modelId);
  }
  if (modelId.startsWith("gemini-")) {
    return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY! })(modelId);
  }
  throw new Error(`Unknown model: ${modelId}`);
}

function logExecution(agent: string, action: string, status = "success") {
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, agent, action, status);
}

// ── Fallback wrapper ────────────────────────────────────────────────────────

async function withFallback<T>(task: TaskType, fn: (modelId: string) => Promise<T>): Promise<T> {
  const tier = ROUTING_TABLE[task];
  const candidates = TIER_PREFERENCES[tier].filter(m => hasKey(m));
  if (candidates.length === 0) throw new Error(`No API key for any ${tier}-tier model (task: ${task})`);

  for (let i = 0; i < candidates.length; i++) {
    try {
      console.log(`[Router] ${task} → ${candidates[i]}`);
      return await fn(candidates[i]);
    } catch (err: any) {
      console.error(`[Router] ${candidates[i]} failed:`, err.message);
      logExecution("Router", `${candidates[i]} failed for ${task}`, "failed");
      if (i === candidates.length - 1) throw err;
    }
  }
  throw new Error("Unreachable");
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function generate(opts: {
  task: TaskType;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}): Promise<string> {
  return withFallback(opts.task, async (modelId) => {
    const result = await generateText({
      model: getProvider(modelId),
      system: opts.system,
      messages: opts.messages as ModelMessage[],
      maxOutputTokens: opts.maxTokens ?? 1024,
    });
    return result.text;
  });
}

export async function generateWithTools<T extends ToolSet>(opts: {
  task: TaskType;
  system: string;
  messages: ModelMessage[];
  tools: T;
  maxSteps?: number;
  maxTokens?: number;
}): Promise<GenerateTextResult<T, never>> {
  return withFallback(opts.task, async (modelId) => {
    return generateText({
      model: getProvider(modelId),
      system: opts.system,
      messages: opts.messages,
      tools: opts.tools,
      stopWhen: stepCountIs(opts.maxSteps ?? 10),
      maxOutputTokens: opts.maxTokens ?? 1024,
    });
  });
}
