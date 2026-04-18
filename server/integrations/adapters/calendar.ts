/**
 * Google Calendar Adapter — fetches events via Calendar REST API.
 * Extracts: event title, attendees, time, description → rawText for graph extraction.
 */
import axios from "axios";
import type { IngestionAdapter, IngestionEvent } from "../types.js";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export const calendarAdapter: IngestionAdapter = {
  source: "google_calendar",

  async fetchAll(accessToken: string): Promise<IngestionEvent[]> {
    const timeMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    return fetchEvents(accessToken, timeMin);
  },

  async fetchSince(accessToken: string, since: string): Promise<IngestionEvent[]> {
    return fetchEvents(accessToken, since);
  },
};

async function fetchEvents(accessToken: string, timeMin: string): Promise<IngestionEvent[]> {
  const events: IngestionEvent[] = [];
  let pageToken: string | undefined;

  while (true) {
    const res = await axios.get(CALENDAR_API, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        timeMin,
        maxResults: 250,
        singleEvents: true,
        orderBy: "startTime",
        pageToken,
      },
    });

    for (const event of res.data.items ?? []) {
      if (!event.summary) continue;

      const start = event.start?.dateTime ?? event.start?.date ?? "";
      const attendees = (event.attendees ?? [])
        .map((a: any) => a.email || a.displayName)
        .filter(Boolean)
        .join(", ");
      const description = (event.description ?? "").slice(0, 500);

      const lines = [
        `Calendar event: ${event.summary}`,
        `Date: ${start}`,
        attendees ? `Attendees: ${attendees}` : "",
        event.location ? `Location: ${event.location}` : "",
        description ? `Description: ${description}` : "",
        event.recurrence ? `Recurring: yes` : "",
      ].filter(Boolean);

      events.push({
        source: "google_calendar",
        externalId: event.id,
        occurredAt: start ? new Date(start).toISOString() : new Date().toISOString(),
        rawText: lines.join("\n"),
      });
    }

    pageToken = res.data.nextPageToken;
    if (!pageToken) break;
  }

  return events;
}
