/**
 * OAuth Token Store — CRUD + auto-refresh for Google tokens.
 */
import { db } from "../infra/storage/db.js";
import { nanoid } from "nanoid";
import axios from "axios";

interface StoredTokens {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

export function saveTokens(
  userId: string,
  provider: string,
  tokens: { access_token: string; refresh_token?: string; expires_in: number; scope?: string }
): void {
  const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString();
  const existing = db.prepare("SELECT id, refresh_token FROM oauth_tokens WHERE user_id=? AND provider=?").get(userId, provider) as any;

  if (existing) {
    db.prepare(
      "UPDATE oauth_tokens SET access_token=?, refresh_token=COALESCE(?, refresh_token), expires_at=?, scope=?, updated_at=datetime('now') WHERE id=?"
    ).run(tokens.access_token, tokens.refresh_token ?? null, expiresAt, tokens.scope ?? "", existing.id);
  } else {
    db.prepare(
      "INSERT INTO oauth_tokens (id, user_id, provider, access_token, refresh_token, expires_at, scope) VALUES (?,?,?,?,?,?,?)"
    ).run(nanoid(), userId, provider, tokens.access_token, tokens.refresh_token ?? null, expiresAt, tokens.scope ?? "");
  }
}

export function getTokens(userId: string, provider: string): StoredTokens | null {
  return db.prepare("SELECT * FROM oauth_tokens WHERE user_id=? AND provider=?").get(userId, provider) as StoredTokens | null;
}

export async function getFreshAccessToken(userId: string, provider: string): Promise<string | null> {
  const tokens = getTokens(userId, provider);
  if (!tokens) return null;

  // Check if still valid (with 60s buffer)
  if (new Date(tokens.expires_at).getTime() > Date.now() + 60_000) {
    return tokens.access_token;
  }

  // Need refresh
  if (!tokens.refresh_token) {
    console.error(`[TokenStore] No refresh_token for ${provider} — user must re-authorize`);
    return null;
  }

  try {
    const res = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    });

    saveTokens(userId, provider, {
      access_token: res.data.access_token,
      expires_in: res.data.expires_in ?? 3600,
      scope: res.data.scope,
    });

    console.log(`[TokenStore] Refreshed ${provider} token`);
    return res.data.access_token;
  } catch (err: any) {
    console.error(`[TokenStore] Token refresh failed:`, err.message);
    return null;
  }
}

export function deleteTokens(userId: string, provider: string): void {
  db.prepare("DELETE FROM oauth_tokens WHERE user_id=? AND provider=?").run(userId, provider);
}

export function isConnected(userId: string, provider: string): boolean {
  return !!db.prepare("SELECT id FROM oauth_tokens WHERE user_id=? AND provider=?").get(userId, provider);
}
