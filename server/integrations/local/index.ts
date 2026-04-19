/**
 * Local Scanner — orchestrates all local data sources.
 *
 * One function: runLocalScan() — reads browser history, contacts, calendar.
 * All data stays local. No API keys. No OAuth. No cloud.
 */
import { db, DEFAULT_USER_ID } from "../../infra/storage/db.js";
import { nanoid } from "nanoid";
import { scanBrowserHistory, getAvailableBrowsers } from "./browser-history.js";
import { scanContacts } from "./contacts.js";
import { scanCalendar } from "./calendar.js";
import { extractFromText } from "../../cognition/extractor.js";
import type { IngestionEvent } from "../types.js";

function log(agent: string, action: string, status = "success") {
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, agent, action, status);
}

export interface LocalScanResult {
  browserEvents: number;
  contacts: number;
  calendarEvents: number;
  nodesCreated: number;
  browsers: string[];
}

export interface LocalScanStatus {
  enabled: boolean;
  lastScanAt: string | null;
  lastResult: LocalScanResult | null;
  availableBrowsers: string[];
}

export function getLocalScanStatus(): LocalScanStatus {
  const lastScan = db.prepare(
    "SELECT finished_at, events_fetched, nodes_created FROM ingestion_log WHERE user_id=? AND source='local' AND status='done' ORDER BY started_at DESC LIMIT 1"
  ).get(DEFAULT_USER_ID) as any;

  return {
    enabled: true, // always available on macOS
    lastScanAt: lastScan?.finished_at ?? null,
    lastResult: lastScan ? {
      browserEvents: 0, contacts: 0, calendarEvents: 0,
      nodesCreated: lastScan.nodes_created,
      browsers: getAvailableBrowsers(),
    } : null,
    availableBrowsers: getAvailableBrowsers(),
  };
}

export async function runLocalScan(opts?: {
  browser?: boolean;
  contacts?: boolean;
  calendar?: boolean;
  sinceDaysAgo?: number;
}): Promise<LocalScanResult> {
  const {
    browser = true,
    contacts = true,
    calendar = true,
    sinceDaysAgo = 30,
  } = opts ?? {};

  console.log("[LocalScan] Starting local scan...");

  const logId = nanoid();
  db.prepare("INSERT INTO ingestion_log (id, user_id, source, run_type, status) VALUES (?,?,?,?,?)")
    .run(logId, DEFAULT_USER_ID, "local", "full", "running");

  const nodesBefore = (db.prepare("SELECT COUNT(*) as c FROM graph_nodes WHERE user_id=?").get(DEFAULT_USER_ID) as any)?.c ?? 0;

  let browserEvents: IngestionEvent[] = [];
  let contactEvents: IngestionEvent[] = [];
  let calendarEvents: IngestionEvent[] = [];

  try {
    // Gather events from all sources
    if (browser) browserEvents = scanBrowserHistory(sinceDaysAgo);
    if (contacts) contactEvents = scanContacts();
    if (calendar) calendarEvents = scanCalendar(sinceDaysAgo);

    const allEvents = [...browserEvents, ...contactEvents, ...calendarEvents];
    const totalFetched = allEvents.length;

    console.log(`[LocalScan] Collected: ${browserEvents.length} URLs, ${contactEvents.length} contacts, ${calendarEvents.length} calendar events`);

    if (allEvents.length === 0) {
      db.prepare("UPDATE ingestion_log SET status='done', events_fetched=0, finished_at=datetime('now') WHERE id=?").run(logId);
      return { browserEvents: 0, contacts: 0, calendarEvents: 0, nodesCreated: 0, browsers: getAvailableBrowsers() };
    }

    // Group by type for smarter extraction prompts
    // Browser: aggregate by domain to reduce noise
    const domainGroups = new Map<string, { title: string; visits: number }[]>();
    for (const e of browserEvents) {
      const url = (e.metadata as any)?.url ?? "";
      const hostname = (() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return "unknown"; } })();
      if (!domainGroups.has(hostname)) domainGroups.set(hostname, []);
      domainGroups.get(hostname)!.push({ title: e.rawText.split("\n")[0]?.replace("Browsed: ", "") ?? "", visits: (e.metadata as any)?.visits ?? 1 });
    }

    // Build aggregated browser summary (top 30 domains by visit count)
    const topDomains = Array.from(domainGroups.entries())
      .map(([domain, pages]) => ({ domain, totalVisits: pages.reduce((s, p) => s + p.visits, 0), topPages: pages.sort((a, b) => b.visits - a.visits).slice(0, 3) }))
      .sort((a, b) => b.totalVisits - a.totalVisits)
      .slice(0, 30);

    if (topDomains.length > 0) {
      const browserText = "Recent browsing activity (most visited sites):\n" +
        topDomains.map(d => `${d.domain} (${d.totalVisits} visits): ${d.topPages.map(p => p.title).join("; ")}`).join("\n");
      await extractFromText(browserText);
      await new Promise(r => setTimeout(r, 500));
    }

    // Contacts: batch in groups of 20
    for (let i = 0; i < contactEvents.length; i += 20) {
      const batch = contactEvents.slice(i, i + 20);
      const text = batch.map(e => e.rawText).join("\n---\n");
      await extractFromText(text);
      if (i + 20 < contactEvents.length) await new Promise(r => setTimeout(r, 500));
    }

    // Calendar: batch in groups of 10
    for (let i = 0; i < calendarEvents.length; i += 10) {
      const batch = calendarEvents.slice(i, i + 10);
      const text = batch.map(e => e.rawText).join("\n---\n");
      await extractFromText(text);
      if (i + 10 < calendarEvents.length) await new Promise(r => setTimeout(r, 500));
    }

    const nodesAfter = (db.prepare("SELECT COUNT(*) as c FROM graph_nodes WHERE user_id=?").get(DEFAULT_USER_ID) as any)?.c ?? 0;
    const nodesCreated = nodesAfter - nodesBefore;

    db.prepare("UPDATE ingestion_log SET status='done', events_fetched=?, nodes_created=?, finished_at=datetime('now') WHERE id=?")
      .run(totalFetched, nodesCreated, logId);

    log("Local Scanner", `Scan done: ${browserEvents.length} URLs, ${contactEvents.length} contacts, ${calendarEvents.length} events → ${nodesCreated} nodes`);
    console.log(`[LocalScan] Done: ${totalFetched} events → ${nodesCreated} new nodes`);

    return {
      browserEvents: browserEvents.length,
      contacts: contactEvents.length,
      calendarEvents: calendarEvents.length,
      nodesCreated,
      browsers: getAvailableBrowsers(),
    };
  } catch (err: any) {
    console.error("[LocalScan] Error:", err.message);
    db.prepare("UPDATE ingestion_log SET status='failed', error=?, finished_at=datetime('now') WHERE id=?")
      .run(err.message?.slice(0, 500), logId);
    log("Local Scanner", `Scan failed: ${err.message}`, "failed");
    return { browserEvents: browserEvents.length, contacts: contactEvents.length, calendarEvents: calendarEvents.length, nodesCreated: 0, browsers: getAvailableBrowsers() };
  }
}
