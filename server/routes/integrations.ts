/**
 * Integrations routes — OAuth connect/disconnect + scan triggers.
 */
import { Router, Request, Response } from "express";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import axios from "axios";
import { saveTokens, getTokens, deleteTokens, isConnected } from "../integrations/token-store.js";
import { runIngestion } from "../integrations/pipeline.js";
import { runLocalScan, getLocalScanStatus } from "../integrations/local/index.js";

const router = Router();

// ── Local Scan (browser history + contacts + calendar) ─────────────────────

router.get("/local/status", (_req, res) => {
  res.json(getLocalScanStatus());
});

router.post("/local/scan", async (_req, res) => {
  res.json({ started: true });
  // Fire and forget — scan runs in background
  runLocalScan().catch(err => console.error("[LocalScan] Error:", err.message));
});

router.post("/local/scan/browser", async (_req, res) => {
  res.json({ started: true });
  runLocalScan({ browser: true, contacts: false, calendar: false }).catch(() => {});
});

router.post("/local/scan/contacts", async (_req, res) => {
  res.json({ started: true });
  runLocalScan({ browser: false, contacts: true, calendar: false }).catch(() => {});
});

router.post("/local/scan/calendar", async (_req, res) => {
  res.json({ started: true });
  runLocalScan({ browser: false, contacts: false, calendar: true }).catch(() => {});
});

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

// ── Connect: get Google OAuth consent URL ──────────────────────────────────

router.get("/google/connect", (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: "GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI must be set in .env" });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

// ── OAuth callback: exchange code for tokens ───────────────────────────────

router.get("/google/callback", async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    });

    const { access_token, refresh_token, expires_in, scope } = tokenRes.data;

    saveTokens(DEFAULT_USER_ID, "google", {
      access_token,
      refresh_token,
      expires_in: expires_in ?? 3600,
      scope,
    });

    // Trigger full scan in background
    runIngestion(DEFAULT_USER_ID, "full").catch(err =>
      console.error("[Integrations] Initial scan failed:", err.message)
    );

    // Redirect to settings page
    res.redirect("/settings?connected=google");
  } catch (err: any) {
    console.error("[Integrations] OAuth token exchange failed:", err.response?.data ?? err.message);
    res.status(500).json({ error: "Failed to exchange authorization code" });
  }
});

// ── Status ─────────────────────────────────────────────────────────────────

router.get("/status", (_req, res) => {
  const googleConnected = isConnected(DEFAULT_USER_ID, "google");
  const tokens = googleConnected ? getTokens(DEFAULT_USER_ID, "google") : null;

  const lastScan = db.prepare(
    "SELECT finished_at, status, events_fetched, nodes_created FROM ingestion_log WHERE user_id=? AND source='google' ORDER BY started_at DESC LIMIT 1"
  ).get(DEFAULT_USER_ID) as any;

  res.json({
    google: {
      connected: googleConnected,
      connectedAt: tokens?.created_at ?? null,
      lastScan: lastScan ? {
        at: lastScan.finished_at,
        status: lastScan.status,
        eventsFetched: lastScan.events_fetched,
        nodesCreated: lastScan.nodes_created,
      } : null,
    },
  });
});

// ── Disconnect ─────────────────────────────────────────────────────────────

router.delete("/google", (_req, res) => {
  deleteTokens(DEFAULT_USER_ID, "google");
  res.json({ ok: true });
});

// ── Manual scan trigger ────────────────────────────────────────────────────

router.post("/google/scan", async (_req, res) => {
  if (!isConnected(DEFAULT_USER_ID, "google")) {
    return res.status(400).json({ error: "Google not connected" });
  }

  // Fire and forget
  runIngestion(DEFAULT_USER_ID, "incremental").catch(err =>
    console.error("[Integrations] Manual scan failed:", err.message)
  );

  res.json({ started: true });
});

export default router;
