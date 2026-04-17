/**
 * L5 Execution — Tool Registry (MCP-inspired).
 *
 * Unified tool registration with:
 * - JSON Schema input definitions (MCP pattern)
 * - L6 action class per tool
 * - Handler type (db / api / browser / code)
 * - Dynamic registration (add tools at runtime)
 * - Per-tool execution logging
 */
import { checkPermission, recordSuccess, recordFailure } from "../permission/gate.js";
import { type ActionClass } from "../permission/levels.js";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { nanoid } from "nanoid";

// ── Tool Definition (MCP-compatible schema) ─────────────────────────────────

export type ToolHandler = "db" | "api" | "browser" | "code" | "internal";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  actionClass: ActionClass;
  handler: ToolHandler;
  execute: (input: any, context?: ExecutionContext) => Promise<ToolResult> | ToolResult;
}

export interface ToolResult {
  success: boolean;
  output: string;
  data?: any;           // structured data for tool composition
  error?: string;
  shouldRetry?: boolean;
  rollback?: () => void; // optional rollback function
}

export interface ExecutionContext {
  previousResults: { toolName: string; output: string; data?: any }[];
  stepIndex: number;
  totalSteps: number;
}

// ── Registry ────────────────────────────────────────────────────────────────

const registry = new Map<string, ToolDef>();

export function registerTool(tool: ToolDef): void {
  registry.set(tool.name, tool);
  console.log(`[Registry] Tool registered: ${tool.name} (${tool.handler}/${tool.actionClass})`);
}

export function getTool(name: string): ToolDef | undefined {
  return registry.get(name);
}

export function getAllTools(): ToolDef[] {
  return Array.from(registry.values());
}

export function getToolsForLLM(): { name: string; description: string; input_schema: any }[] {
  return getAllTools().map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

// ── Unified execution with L6 gate + logging + error classification ─────────

function logToolCall(toolName: string, input: any, result: ToolResult, latencyMs: number) {
  db.prepare(
    "INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)"
  ).run(
    nanoid(), DEFAULT_USER_ID,
    "Execution Agent",
    `tool:${toolName}(${JSON.stringify(input).slice(0, 100)}) → ${result.success ? result.output.slice(0, 80) : `ERROR: ${result.error?.slice(0, 80)}`} [${latencyMs}ms]`,
    result.success ? "success" : "failed"
  );
}

export async function executeTool(
  name: string,
  input: any,
  context?: ExecutionContext,
  source: "user_triggered" | "cron" | "agent_chain" = "user_triggered"
): Promise<ToolResult> {
  const tool = registry.get(name);
  if (!tool) return { success: false, output: `Unknown tool: ${name}`, error: "TOOL_NOT_FOUND" };

  // L6 Permission gate
  const gate = checkPermission({
    actionClass: tool.actionClass,
    description: `${tool.name}(${JSON.stringify(input).slice(0, 120)})`,
    source,
  });

  if (gate.decision === "deny") {
    return { success: false, output: `Permission denied: ${gate.reason}`, error: "PERMISSION_DENIED" };
  }
  if (gate.decision === "require_confirmation") {
    return { success: false, output: `Requires confirmation: ${gate.reason}`, error: "NEEDS_CONFIRMATION" };
  }

  // Execute with timing
  const start = Date.now();
  try {
    const result = await tool.execute(input, context);
    const latency = Date.now() - start;
    logToolCall(name, input, result, latency);
    // L6 trust progression: record success/failure
    if (result.success) recordSuccess(tool.actionClass);
    else recordFailure(tool.actionClass);
    return result;
  } catch (err: any) {
    const latency = Date.now() - start;
    const result: ToolResult = {
      success: false,
      output: `Tool error: ${err.message}`,
      error: err.message,
      shouldRetry: true,
    };
    logToolCall(name, input, result, latency);
    recordFailure(tool.actionClass);
    return result;
  }
}

// ── Registry info for admin ─────────────────────────────────────────────────

export function getRegistryInfo() {
  return getAllTools().map(t => ({
    name: t.name,
    description: t.description,
    handler: t.handler,
    actionClass: t.actionClass,
    inputSchema: t.inputSchema,
  }));
}
