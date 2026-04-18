/**
 * Ingestion Pipeline — fetches data from external sources, extracts graph nodes.
 *
 * Flow: getFreshAccessToken → adapters.fetchSince → batch events → extractFromText → log results
 */
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { nanoid } from "nanoid";
import { getFreshAccessToken, isConnected } from "./token-store.js";
import { gmailAdapter } from "./adapters/gmail.js";
import { calendarAdapter } from "./adapters/calendar.js";
import { extractFromText } from "../cognition/extractor.js";
import type { IngestionEvent } from "./types.js";

function log(agent: string, action: string, status = "success") {
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(nanoid(), DEFAULT_USER_ID, agent, action, status);
}

export async function runIngestion(
  userId: string,
  runType: "full" | "incremental"
): Promise<{ eventsFetched: number; nodesCreated: number } | null> {
  // Skip if not connected
  if (!isConnected(userId, "google")) return null;

  const accessToken = await getFreshAccessToken(userId, "google");
  if (!accessToken) {
    console.error("[Ingestion] Failed to get access token");
    return null;
  }

  // Create log entry
  const logId = nanoid();
  db.prepare(
    "INSERT INTO ingestion_log (id, user_id, source, run_type, status) VALUES (?,?,?,?,?)"
  ).run(logId, userId, "google", runType, "running");

  try {
    // Determine since date
    let since: string;
    if (runType === "incremental") {
      const lastRun = db.prepare(
        "SELECT finished_at FROM ingestion_log WHERE user_id=? AND source='google' AND status='done' ORDER BY finished_at DESC LIMIT 1"
      ).get(userId) as any;
      since = lastRun?.finished_at ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    }

    console.log(`[Ingestion] ${runType} scan starting (since ${since.slice(0, 10)})...`);

    // Fetch from both adapters in parallel
    const [gmailEvents, calendarEvents] = await Promise.all([
      gmailAdapter.fetchSince(accessToken, since).catch((err) => {
        console.error("[Ingestion] Gmail fetch error:", err.message);
        return [] as IngestionEvent[];
      }),
      calendarAdapter.fetchSince(accessToken, since).catch((err) => {
        console.error("[Ingestion] Calendar fetch error:", err.message);
        return [] as IngestionEvent[];
      }),
    ]);

    const allEvents = [...gmailEvents, ...calendarEvents];
    const totalFetched = allEvents.length;

    console.log(`[Ingestion] Fetched ${gmailEvents.length} emails + ${calendarEvents.length} calendar events`);

    if (allEvents.length === 0) {
      db.prepare("UPDATE ingestion_log SET status='done', events_fetched=0, finished_at=datetime('now') WHERE id=?").run(logId);
      return { eventsFetched: 0, nodesCreated: 0 };
    }

    // Count nodes before extraction
    const nodesBefore = (db.prepare("SELECT COUNT(*) as c FROM graph_nodes WHERE user_id=?").get(userId) as any)?.c ?? 0;

    // Batch events into chunks of 10, process serially
    for (let i = 0; i < allEvents.length; i += 10) {
      const batch = allEvents.slice(i, i + 10);
      const combinedText = batch.map(e => e.rawText).join("\n\n---\n\n");

      await extractFromText(combinedText);

      // Delay between batches to avoid hammering LLM
      if (i + 10 < allEvents.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Count nodes after extraction
    const nodesAfter = (db.prepare("SELECT COUNT(*) as c FROM graph_nodes WHERE user_id=?").get(userId) as any)?.c ?? 0;
    const nodesCreated = nodesAfter - nodesBefore;

    // Update log
    db.prepare(
      "UPDATE ingestion_log SET status='done', events_fetched=?, nodes_created=?, finished_at=datetime('now') WHERE id=?"
    ).run(totalFetched, nodesCreated, logId);

    log("Ingestion Pipeline", `${runType}: ${totalFetched} events → ${nodesCreated} new nodes`);
    console.log(`[Ingestion] Done: ${totalFetched} events → ${nodesCreated} new nodes`);

    return { eventsFetched: totalFetched, nodesCreated };
  } catch (err: any) {
    console.error("[Ingestion] Pipeline error:", err.message);
    db.prepare("UPDATE ingestion_log SET status='failed', error=?, finished_at=datetime('now') WHERE id=?")
      .run(err.message?.slice(0, 500), logId);
    log("Ingestion Pipeline", `${runType} failed: ${err.message}`, "failed");
    return null;
  }
}
