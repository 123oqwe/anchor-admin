/**
 * L8 Infrastructure — MCP (Model Context Protocol) Server.
 *
 * Exposes Anchor's L5 tools as MCP-compatible endpoints.
 * External MCP clients (Claude Desktop, Cursor, VS Code) can
 * connect and use Anchor's tools.
 *
 * Also supports connecting TO external MCP servers to import their tools.
 *
 * Activation: set MCP_ENABLED=true in .env
 * Protocol: JSON-RPC 2.0 over stdio or HTTP
 */
import { getAllTools, type ToolDef } from "../../execution/registry.js";

let mcpEnabled = false;

export function initMCP(): boolean {
  if (process.env.MCP_ENABLED !== "true") {
    console.log("[MCP] Disabled (set MCP_ENABLED=true to enable)");
    return false;
  }
  mcpEnabled = true;
  console.log("[MCP] Server enabled — tools exposed via MCP protocol");
  return true;
}

// ── MCP tool listing (tools/list response) ──────────────────────────────────

export function getMCPToolList(): {
  tools: { name: string; description: string; inputSchema: any }[];
} {
  const tools = getAllTools();
  return {
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
}

// ── MCP tool call handler (tools/call) ──────────────────────────────────────

export async function handleMCPToolCall(
  name: string,
  args: any
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const { executeTool } = await import("../../execution/registry.js");
  const result = await executeTool(name, args, undefined, "agent_chain");

  return {
    content: [{ type: "text", text: result.output }],
    isError: !result.success,
  };
}

// ── External MCP server connections (future) ────────────────────────────────

interface ExternalMCPServer {
  name: string;
  url: string;
  tools: string[];
  status: "connected" | "disconnected" | "error";
}

const externalServers: ExternalMCPServer[] = [];

export function registerExternalMCP(name: string, url: string): void {
  externalServers.push({ name, url, tools: [], status: "disconnected" });
  console.log(`[MCP] External server registered: ${name} (${url})`);
}

export function getMCPStatus() {
  return {
    enabled: mcpEnabled,
    exposedTools: getAllTools().length,
    externalServers: externalServers.map(s => ({ name: s.name, url: s.url, status: s.status, tools: s.tools.length })),
  };
}

export function isMCPEnabled(): boolean {
  return mcpEnabled;
}
