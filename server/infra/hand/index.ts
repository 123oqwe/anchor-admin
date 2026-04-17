/**
 * L8 Infrastructure — Hand Runtime (unified).
 *
 * Initializes all hand capabilities:
 * - Browser (Playwright)
 * - Computer Use (Anthropic)
 *
 * Each sub-runtime registers its tools into L5 registry on init.
 */
import { initBrowser, registerBrowserTools, isBrowserEnabled, closeBrowser } from "./browser.js";
import { initComputerUse, registerComputerTools, isComputerUseEnabled } from "./computer.js";

export async function initHand(): Promise<void> {
  // Browser runtime
  const browserOk = await initBrowser();
  if (browserOk) registerBrowserTools();

  // Computer use runtime
  const computerOk = initComputerUse();
  if (computerOk) registerComputerTools();

  const total = (browserOk ? 5 : 0) + (computerOk ? 3 : 0);
  if (total > 0) {
    console.log(`[Hand] ${total} hand tools registered (browser: ${browserOk}, computer: ${computerOk})`);
  } else {
    console.log("[Hand] No hand tools enabled (set BROWSER_ENABLED=true or COMPUTER_USE_ENABLED=true)");
  }
}

export function getHandStatus() {
  return {
    browser: { enabled: isBrowserEnabled() },
    computer: { enabled: isComputerUseEnabled() },
  };
}

export { closeBrowser };
