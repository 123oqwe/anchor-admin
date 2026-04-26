# Anchor OS — Admin Panel Spec

## What This Is

Anchor has a **user-facing product** (Dashboard, Advisor, Settings) and needs a **company-level admin panel** for the founder/operator to monitor, control, and debug the AI system.

The admin panel is NOT for end users. It's the cockpit for running an AI product.

## Architecture

```
/admin                    → Overview (one-screen health)
/admin/models             → AI Ops: Model management (was Cortex)
/admin/costs              → AI Ops: Spend tracking (exists)
/admin/performance        → AI Ops: Latency/success (exists)
/admin/logs               → AI Ops: LLM call inspector (exists, enhance)
/admin/agents             → Agent Monitor: 11 system + N custom (NEW)
/admin/crons              → Agent Monitor: 13 cron jobs (NEW)
/admin/permissions        → Trust: Permission gate control (NEW)
/admin/privacy            → Trust: LLM disclosure + delete data (NEW)
/admin/graph              → Data: Graph explorer (exists)
/admin/memory             → Data: Memory stats (exists)
/admin/data               → Data: Export/import/batch ops (exists, enhance)
/admin/health             → merged into Overview
```

## Architecture — Separate Process, Shared Database

```
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ USER PRODUCT (:3000)         │    │ ADMIN PANEL (:3001)          │
│ server/index.ts              │    │ server/admin.ts (NEW)        │
│ Dashboard · Advisor · etc    │    │ Overview · AI Ops · Agents   │
│ + WebSocket + Cron + Telegram│    │ Trust · Data                 │
│                              │    │ NO cron, NO ws, NO telegram  │
└──────────────┬───────────────┘    └──────────────┬───────────────┘
               │                                   │
               └──────────┬────────────────────────┘
                          │
                   ┌──────┴──────┐
                   │  anchor.db  │
                   │  SQLite WAL │
                   │  32 tables  │
                   └─────────────┘
```

Two processes, one database. Admin reads from the SAME tables the product writes to. Admin writes to config tables (route_overrides, trust_state, user_crons).

**Why separate process:**
- Main server crashes → Admin still works for diagnosis
- Admin heavy queries don't slow user experience
- Can restart independently
- `npm run dev` starts product, `npm run admin` starts admin panel

## 5 Areas — Detailed Spec

### 1. Overview (`/admin`)

**Purpose:** 3 seconds to know if system is healthy.

**Data sources (all existing APIs):**
- `GET /api/admin/health` → confirm rate, failures, latency
- `GET /api/agents/status` → agent success/failure counts
- `GET /api/admin/costs` → spending
- `GET /api/memory/stats` → memory usage
- `GET /api/graph` → node/edge counts

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ 🟢 System Healthy              Last updated: 2s │
├────────┬────────┬────────┬────────┬─────────────┤
│Decisions│LLM Cost│Failures│  Graph │   Memory    │
│ 23/67% │ $0.43  │   2    │847 nodes│  156/200   │
├────────┴────────┴────────┴────────┴─────────────┤
│ ⚠️ Alerts                                       │
│ • Evolution: 0 updates in 3 days                │
│ • Memory: 78% capacity                         │
├─────────────────────────────────────────────────┤
│ Recent Agent Activity (live feed, last 20)      │
│ 14:32 Decision Agent  Plan: pitch strategy  ✅  │
│ 14:30 Extractor       3 nodes extracted     ✅  │
│ 14:28 Twin Agent      Learned: cautious     ✅  │
└─────────────────────────────────────────────────┘
```

**New backend needed:** None. All data from existing endpoints.

---

### 2. AI Ops (`/admin/models`, `/admin/costs`, `/admin/performance`, `/admin/logs`)

**Exists:** 4 pages already built.

**Enhance `/admin/logs` with request replay:**

Current: shows task, model, tokens, status (table rows).
Add: click a row → expand to show full `request_preview` and `response_preview` from `llm_calls` table.

**New backend needed:**
- `GET /api/admin/calls/:id` already exists and returns `request_preview` + `response_preview`
- Frontend just needs to render it in an expandable row

---

### 3. Agent Monitor (`/admin/agents` NEW, `/admin/crons` NEW)

**`/admin/agents` — All agents in one view**

**New backend endpoint:**
```
GET /api/admin/agent-status
Returns:
{
  systemAgents: [
    { name: "Decision Agent", lastRun: "2min ago", successes: 234, failures: 3, status: "active" },
    { name: "Twin Agent", lastRun: "Mon 9am", successes: 45, failures: 1, status: "idle" },
    ...
  ],
  customAgents: [
    { id: "abc", name: "Competitor Analyst", lastRun: "3 days ago", runs: 2, status: "manual" },
    ...
  ]
}
```

**Implementation:** Query `agent_executions` grouped by agent, get MAX(created_at) for last run, COUNT by status.

**Manual trigger buttons:**
- Custom agents: `POST /api/agents/custom/:id/run` (exists)
- System engines: new endpoint `POST /api/admin/trigger/:engine`
  - engine = "dream" | "evolution" | "gepa" | "system-evolution" | "proactive" | "digest"
  - Calls the engine function directly, returns result

**`/admin/crons` — Cron job manager**

**New backend endpoint:**
```
GET /api/admin/cron-status
Returns:
{
  jobs: [
    { name: "Activity Capture", pattern: "*/5 * * * *", lastRun: "2min ago", status: "ok", enabled: true },
    { name: "Dream Engine", pattern: "0 3 * * *", lastRun: "today 3am", status: "ok", enabled: true },
    ...
  ]
}
```

**Implementation:** Track last-run timestamps in memory (Map<string, Date>). Each cron wrapper updates the map after execution.

---

### 4. Trust & Safety (`/admin/permissions` NEW, `/admin/privacy` NEW)

**`/admin/permissions` — Permission gate control**

**Backend:** `GET /api/admin/permissions` already exists. Returns all action classes with trust levels.

**New backend:**
- `PUT /api/admin/permissions/trust/:actionClass` (exists) — set trust level
- `POST /api/admin/permissions/lockdown` (exists) — emergency lockdown
- `DELETE /api/admin/permissions/lockdown` (exists) — unlock
- `GET /api/admin/permissions/audit` (NEW) — recent permission_audit rows

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Permission Gate                    [🔴 LOCKDOWN]│
├──────────────┬────────┬────────┬────────┬───────┤
│ Action       │ Risk   │ Level  │ Score  │       │
├──────────────┼────────┼────────┼────────┼───────┤
│ write_task   │ low    │ L3 auto│ 10✓ 0✗ │ [▼]   │
│ send_external│ high   │ L2 cfm │  3✓ 0✗ │ [▼]   │
├──────────────┴────────┴────────┴────────┴───────┤
│ Audit Log (last 50)                             │
│ 14:32 write_graph  allow  user  "Update node"   │
└─────────────────────────────────────────────────┘
```

**`/admin/privacy` — LLM transparency + data control**

**Backend:**
- `GET /api/privacy/llm-disclosures` (exists) — what data was sent where
- `DELETE /api/privacy/delete-all` (exists) — wipe everything
- `GET /api/privacy/policy` (exists) — privacy policy text

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ LLM Data Disclosure (last 24h)                  │
│ Anthropic: 47 calls | graph + memory + history  │
│ OpenAI:     0 calls | (fallback)                │
├─────────────────────────────────────────────────┤
│ Data Sent: node labels, memory content, chat    │
│ NOT Sent:  raw URLs, contacts, calendar details │
├─────────────────────────────────────────────────┤
│ [🔴 Delete All My Data]                         │
│ Permanently removes graph, memories, insights,  │
│ skills, messages, and all personal data.         │
└─────────────────────────────────────────────────┘
```

---

### 5. Data Management (`/admin/graph`, `/admin/memory`, `/admin/data`)

**Exists:** 3 pages.

**Enhance `/admin/data` with:**

- Batch delete: checkbox select nodes → "Delete 47 selected" button
- Quality audit: show nodes with no edges, no detail, label < 5 chars
- Manual trigger: "Run Dream Now" / "Run Evolution Now" / "Run GEPA Now" buttons

**New backend for batch ops:**
```
POST /api/admin/batch-delete
{ nodeIds: ["id1", "id2", ...] }

GET /api/admin/quality-audit
Returns: { orphanNodes: [...], emptyDetail: [...], shortLabels: [...] }
```

---

## New Files Needed

### Backend (4 files to modify, 0 new)
```
server/routes/admin.ts          — add 4 endpoints (agent-status, cron-status, trigger, batch-delete, quality-audit, permissions/audit)
server/orchestration/cron.ts    — add lastRun tracking Map
```

### Frontend (5 new pages, 1 modify)
```
client/src/pages/admin/Overview.tsx      — NEW: one-screen health dashboard
client/src/pages/admin/Agents.tsx        — NEW: agent monitor + manual trigger
client/src/pages/admin/Crons.tsx         — NEW: cron job manager
client/src/pages/admin/Permissions.tsx   — NEW: trust gate control + audit
client/src/pages/admin/Privacy.tsx       — NEW: LLM disclosure + delete all
client/src/components/AdminLayout.tsx    — MODIFY: new nav structure
client/src/App.tsx                       — MODIFY: new routes
```

## Design Principles

1. **Dark theme** — matches user product, no context switching
2. **Data-dense** — admin can handle more info per screen than users
3. **Real-time** — WebSocket for live agent activity, not polling
4. **Action-oriented** — every panel has control buttons, not just read-only
5. **No separate auth** — same session as user product (single-user system)

## Navigation Restructure

Current AdminLayout sidebar:
```
Cortex (model mgmt)
Costs
Performance
Logs
Graph
Memory
Data
Health
```

New AdminLayout sidebar:
```
── Overview ──
  Dashboard              → /admin

── AI Operations ──
  Models                 → /admin/models
  Costs                  → /admin/costs
  Performance            → /admin/performance
  LLM Logs               → /admin/logs

── Agent Monitor ──
  System Agents          → /admin/agents
  Cron Jobs              → /admin/crons

── Trust & Safety ──
  Permissions            → /admin/permissions
  Privacy & Compliance   → /admin/privacy

── Data ──
  Graph Explorer         → /admin/graph
  Memory Store           → /admin/memory
  Import / Export        → /admin/data
```
