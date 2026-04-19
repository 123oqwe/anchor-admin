/**
 * L8 Infrastructure — Hand Runtime.
 *
 * Browser automation via Playwright (optional).
 * Computer Use removed — unreliable in production (2026 consensus).
 */
import { initBrowser, registerBrowserTools, isBrowserEnabled, closeBrowser } from "./browser.js";

export async function initHand(): Promise<void> {
  const browserOk = await initBrowser();
  if (browserOk) {
    registerBrowserTools();
    console.log("[Hand] 5 browser tools registered");
  } else {
    console.log("[Hand] Browser disabled (set BROWSER_ENABLED=true to enable)");
  }
}

export function getHandStatus() {
  return { browser: { enabled: isBrowserEnabled() } };
}

export { closeBrowser };
