/**
 * L5 Execution — Internal tool runtime (capability substrate).
 * These are the deterministic actions the Execution Agent can take.
 * Future: browser runtime, computer runtime, API connectors all live here.
 */
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { bus } from "../orchestration/bus.js";
import { nanoid } from "nanoid";
import { checkPermission } from "../permission/gate.js";
import { type ActionClass } from "../permission/levels.js";
import { writeMemory } from "../memory/retrieval.js";

function log(agent: string, action: string, status = "success") {
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, agent, action, status);
}

export interface ToolDef {
  name: string;
  description: string;
  input_schema: any;
  actionClass: ActionClass;       // L6 permission classification
  execute: (input: any) => string;
}

export const INTERNAL_TOOLS: ToolDef[] = [
  {
    name: "write_task",
    description: "Create a task in the user's Workspace",
    actionClass: "write_task",
    input_schema: { type: "object", properties: { title: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] } }, required: ["title"] },
    execute: (input: any) => {
      const project = db.prepare("SELECT id FROM projects WHERE user_id=? ORDER BY created_at DESC LIMIT 1").get(DEFAULT_USER_ID) as any;
      if (!project) return "No project found.";
      db.prepare("INSERT INTO tasks (id, project_id, title, status, priority, tags) VALUES (?,?,?,?,?,?)")
        .run(nanoid(), project.id, input.title, "todo", input.priority ?? "high", JSON.stringify(["auto", "react"]));
      log("Execution Agent", `Task: "${input.title}"`);
      return `Task "${input.title}" created (${input.priority ?? "high"}).`;
    },
  },
  {
    name: "update_graph_node",
    description: "Update a Human Graph node's status",
    actionClass: "write_graph",
    input_schema: { type: "object", properties: { label: { type: "string" }, new_status: { type: "string", enum: ["active", "done", "in-progress", "blocked"] } }, required: ["label", "new_status"] },
    execute: (input: any) => {
      const node = db.prepare("SELECT id, label, status FROM graph_nodes WHERE user_id=? AND label LIKE ?").get(DEFAULT_USER_ID, `%${input.label}%`) as any;
      if (!node) return `No node matching "${input.label}".`;
      db.prepare("UPDATE graph_nodes SET status=?, updated_at=datetime('now') WHERE id=?").run(input.new_status, node.id);
      log("Execution Agent", `Graph: "${node.label}" → ${input.new_status}`);
      bus.publish({ type: "GRAPH_UPDATED", payload: { nodeId: node.id, status: input.new_status, label: node.label } });
      return `"${node.label}": ${node.status} → ${input.new_status}.`;
    },
  },
  {
    name: "record_outcome",
    description: "Record an execution outcome to memory",
    actionClass: "write_memory",
    input_schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
    execute: (input: any) => {
      writeMemory({ type: "episodic", title: "Execution Outcome", content: input.summary, tags: ["execution", "auto"], source: "Execution Agent", confidence: 0.9 });
      log("Execution Agent", `Outcome: ${input.summary.slice(0, 50)}`);
      return "Recorded.";
    },
  },
];

export function executeTool(name: string, input: any, source: "user_triggered" | "cron" | "agent_chain" = "user_triggered"): string {
  const tool = INTERNAL_TOOLS.find(t => t.name === name);
  if (!tool) return `Unknown tool: ${name}`;

  // L6 Permission gate — every side-effecting tool call passes through here.
  const gate = checkPermission({
    actionClass: tool.actionClass,
    description: `${tool.name}(${JSON.stringify(input).slice(0, 120)})`,
    source,
  });

  if (gate.decision === "deny") return `Denied: ${gate.reason}`;
  if (gate.decision === "require_confirmation") return `Requires user confirmation: ${gate.reason}`;
  return tool.execute(input);
}
