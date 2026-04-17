/**
 * L8 Infrastructure — Hand: Browser Runtime.
 *
 * Provides browser automation tools to L5 Execution layer.
 * Based on Playwright MCP pattern — registers browser actions
 * as tools in the L5 tool registry.
 *
 * Activation: set BROWSER_ENABLED=true in .env
 * Uses: Playwright (must be installed: pnpm add playwright)
 */
import { registerTool, type ToolResult } from "../../execution/registry.js";

let browserEnabled = false;
let browser: any = null;
let page: any = null;

// ── Initialize browser ──────────────────────────────────────────────────────

export async function initBrowser(): Promise<boolean> {
  if (process.env.BROWSER_ENABLED !== "true") {
    console.log("[Hand:Browser] Disabled (set BROWSER_ENABLED=true to enable)");
    return false;
  }

  try {
    const pw = await import("playwright" as string).catch(() => null) as any;
    if (!pw) {
      console.log("[Hand:Browser] Playwright not installed (pnpm add playwright)");
      return false;
    }
    browser = await pw.chromium.launch({ headless: true });
    page = await browser.newPage();
    browserEnabled = true;
    console.log("[Hand:Browser] Chromium launched (headless)");
    return true;
  } catch (err: any) {
    console.log(`[Hand:Browser] Failed to launch: ${err.message}`);
    return false;
  }
}

// ── Register browser tools ──────────────────────────────────────────────────

export function registerBrowserTools(): void {
  registerTool({
    name: "browser_navigate",
    description: "Navigate the browser to a URL and return the page title + text content",
    handler: "browser",
    actionClass: "browser_action",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
      },
      required: ["url"],
    },
    execute: async (input): Promise<ToolResult> => {
      if (!browserEnabled || !page) return { success: false, output: "Browser not enabled", error: "BROWSER_DISABLED" };
      try {
        await page.goto(input.url, { timeout: 15000 });
        const title = await page.title();
        const text = await page.innerText("body").catch(() => "");
        return { success: true, output: `Title: ${title}\n\n${text.slice(0, 2000)}`, data: { title, url: input.url } };
      } catch (err: any) {
        return { success: false, output: `Navigation failed: ${err.message}`, error: err.message, shouldRetry: true };
      }
    },
  });

  registerTool({
    name: "browser_screenshot",
    description: "Take a screenshot of the current page (returns base64)",
    handler: "browser",
    actionClass: "browser_action",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async (): Promise<ToolResult> => {
      if (!browserEnabled || !page) return { success: false, output: "Browser not enabled", error: "BROWSER_DISABLED" };
      try {
        const buffer = await page.screenshot({ type: "png" });
        const base64 = buffer.toString("base64");
        return { success: true, output: `Screenshot taken (${Math.round(base64.length / 1024)}KB)`, data: { base64, mimeType: "image/png" } };
      } catch (err: any) {
        return { success: false, output: `Screenshot failed: ${err.message}`, error: err.message };
      }
    },
  });

  registerTool({
    name: "browser_click",
    description: "Click an element on the page by CSS selector",
    handler: "browser",
    actionClass: "browser_action",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the element to click" },
      },
      required: ["selector"],
    },
    execute: async (input): Promise<ToolResult> => {
      if (!browserEnabled || !page) return { success: false, output: "Browser not enabled", error: "BROWSER_DISABLED" };
      try {
        await page.click(input.selector, { timeout: 5000 });
        return { success: true, output: `Clicked: ${input.selector}` };
      } catch (err: any) {
        return { success: false, output: `Click failed: ${err.message}`, error: err.message };
      }
    },
  });

  registerTool({
    name: "browser_type",
    description: "Type text into an input field identified by CSS selector",
    handler: "browser",
    actionClass: "browser_action",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the input field" },
        text: { type: "string", description: "Text to type" },
      },
      required: ["selector", "text"],
    },
    execute: async (input): Promise<ToolResult> => {
      if (!browserEnabled || !page) return { success: false, output: "Browser not enabled", error: "BROWSER_DISABLED" };
      try {
        await page.fill(input.selector, input.text, { timeout: 5000 });
        return { success: true, output: `Typed "${input.text.slice(0, 30)}" into ${input.selector}` };
      } catch (err: any) {
        return { success: false, output: `Type failed: ${err.message}`, error: err.message };
      }
    },
  });

  registerTool({
    name: "browser_extract",
    description: "Extract text content from elements matching a CSS selector",
    handler: "browser",
    actionClass: "browser_action",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector to extract text from" },
      },
      required: ["selector"],
    },
    execute: async (input): Promise<ToolResult> => {
      if (!browserEnabled || !page) return { success: false, output: "Browser not enabled", error: "BROWSER_DISABLED" };
      try {
        const elements = await page.$$(input.selector);
        const texts = await Promise.all(elements.slice(0, 10).map(async (el: any) => {
          return await el.innerText().catch(() => "");
        }));
        const result = texts.filter(Boolean).join("\n---\n").slice(0, 3000);
        return { success: true, output: result || "(no text found)", data: { count: elements.length } };
      } catch (err: any) {
        return { success: false, output: `Extract failed: ${err.message}`, error: err.message };
      }
    },
  });

  console.log("[Hand:Browser] 5 browser tools registered");
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    page = null;
    browserEnabled = false;
  }
}

export function isBrowserEnabled(): boolean {
  return browserEnabled;
}
