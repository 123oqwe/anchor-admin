/**
 * L8 Infrastructure — Hand: Computer Use Runtime.
 *
 * Wraps Anthropic's computer_use tool for desktop automation.
 * Registers computer control actions in L5 tool registry.
 *
 * Activation: set COMPUTER_USE_ENABLED=true in .env
 * Requires: Anthropic API key + Claude Sonnet 3.5+
 */
import { registerTool, type ToolResult } from "../../execution/registry.js";

let computerUseEnabled = false;

export function initComputerUse(): boolean {
  if (process.env.COMPUTER_USE_ENABLED !== "true") {
    console.log("[Hand:Computer] Disabled (set COMPUTER_USE_ENABLED=true to enable)");
    return false;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[Hand:Computer] No ANTHROPIC_API_KEY — cannot use computer control");
    return false;
  }
  computerUseEnabled = true;
  console.log("[Hand:Computer] Enabled — desktop automation available");
  return true;
}

export function registerComputerTools(): void {
  registerTool({
    name: "computer_screenshot",
    description: "Take a screenshot of the entire desktop screen",
    handler: "browser",
    actionClass: "browser_action",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async (): Promise<ToolResult> => {
      if (!computerUseEnabled) return { success: false, output: "Computer use not enabled", error: "COMPUTER_DISABLED" };
      // Placeholder — actual implementation requires Anthropic computer_use tool
      // which runs in a specialized environment (Docker container with VNC)
      return { success: false, output: "Computer use requires specialized runtime environment (Docker + VNC). Not available in standard deployment.", error: "NOT_CONFIGURED" };
    },
  });

  registerTool({
    name: "computer_click",
    description: "Click at specific x,y coordinates on the desktop screen",
    handler: "browser",
    actionClass: "browser_action",
    inputSchema: {
      type: "object",
      properties: {
        x: { type: "number", description: "X coordinate" },
        y: { type: "number", description: "Y coordinate" },
      },
      required: ["x", "y"],
    },
    execute: async (): Promise<ToolResult> => {
      if (!computerUseEnabled) return { success: false, output: "Computer use not enabled", error: "COMPUTER_DISABLED" };
      return { success: false, output: "Computer use requires specialized runtime", error: "NOT_CONFIGURED" };
    },
  });

  registerTool({
    name: "computer_type",
    description: "Type text on the desktop keyboard",
    handler: "browser",
    actionClass: "browser_action",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to type" },
      },
      required: ["text"],
    },
    execute: async (): Promise<ToolResult> => {
      if (!computerUseEnabled) return { success: false, output: "Computer use not enabled", error: "COMPUTER_DISABLED" };
      return { success: false, output: "Computer use requires specialized runtime", error: "NOT_CONFIGURED" };
    },
  });

  console.log("[Hand:Computer] 3 computer tools registered (requires Docker runtime)");
}

export function isComputerUseEnabled(): boolean {
  return computerUseEnabled;
}
