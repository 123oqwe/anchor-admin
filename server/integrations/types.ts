/**
 * Ingestion Pipeline — Types.
 *
 * Canonical event shape that all adapters produce.
 * The pipeline feeds these to the existing extractor.ts for graph extraction.
 */

export interface IngestionEvent {
  source: "gmail" | "google_calendar";
  externalId: string;
  occurredAt: string;
  rawText: string;
  metadata?: Record<string, unknown>;
}

export interface IngestionAdapter {
  source: IngestionEvent["source"];
  fetchAll(accessToken: string): Promise<IngestionEvent[]>;
  fetchSince(accessToken: string, since: string): Promise<IngestionEvent[]>;
}
