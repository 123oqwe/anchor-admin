/**
 * Gmail Adapter — fetches emails via Google Gmail REST API.
 * Extracts: sender, recipient, subject, date → rawText for graph extraction.
 */
import axios from "axios";
import type { IngestionAdapter, IngestionEvent } from "../types.js";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

async function fetchMessageMetadata(
  accessToken: string,
  messageId: string
): Promise<IngestionEvent | null> {
  try {
    const res = await axios.get(`${GMAIL_API}/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { format: "metadata", metadataHeaders: "From,To,Cc,Subject,Date" },
    });

    const headers: GmailHeader[] = res.data.payload?.headers ?? [];
    const from = getHeader(headers, "From");
    const to = getHeader(headers, "To");
    const cc = getHeader(headers, "Cc");
    const subject = getHeader(headers, "Subject");
    const date = getHeader(headers, "Date");
    const snippet = res.data.snippet ?? "";

    if (!from && !subject) return null;

    const lines = [
      `Email from: ${from}`,
      to ? `To: ${to}` : "",
      cc ? `Cc: ${cc}` : "",
      `Subject: ${subject}`,
      `Date: ${date}`,
      snippet ? `Preview: ${snippet.slice(0, 200)}` : "",
    ].filter(Boolean);

    return {
      source: "gmail",
      externalId: messageId,
      occurredAt: date ? new Date(date).toISOString() : new Date().toISOString(),
      rawText: lines.join("\n"),
    };
  } catch {
    return null;
  }
}

async function fetchMessageList(
  accessToken: string,
  query: string,
  maxResults = 100
): Promise<GmailMessage[]> {
  const messages: GmailMessage[] = [];
  let pageToken: string | undefined;

  while (messages.length < maxResults) {
    const res = await axios.get(`${GMAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { q: query, maxResults: Math.min(50, maxResults - messages.length), pageToken },
    });

    const batch = res.data.messages ?? [];
    messages.push(...batch);

    pageToken = res.data.nextPageToken;
    if (!pageToken || batch.length === 0) break;
  }

  return messages;
}

export const gmailAdapter: IngestionAdapter = {
  source: "gmail",

  async fetchAll(accessToken: string): Promise<IngestionEvent[]> {
    const list = await fetchMessageList(accessToken, "newer_than:90d", 100);
    return fetchBatch(accessToken, list);
  },

  async fetchSince(accessToken: string, since: string): Promise<IngestionEvent[]> {
    const unixTs = Math.floor(new Date(since).getTime() / 1000);
    const list = await fetchMessageList(accessToken, `after:${unixTs}`, 50);
    return fetchBatch(accessToken, list);
  },
};

async function fetchBatch(accessToken: string, messages: GmailMessage[]): Promise<IngestionEvent[]> {
  const events: IngestionEvent[] = [];
  // Process in batches of 20 with delay to respect rate limits
  for (let i = 0; i < messages.length; i += 20) {
    const batch = messages.slice(i, i + 20);
    const results = await Promise.all(
      batch.map(m => fetchMessageMetadata(accessToken, m.id))
    );
    events.push(...results.filter(Boolean) as IngestionEvent[]);
    if (i + 20 < messages.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return events;
}
