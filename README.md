# anchor-admin

Operator cockpit for **Anchor** — the admin panel UI. NOT for end users.

Talks to **`anchor-backend`** admin server (`server/admin.ts` on port `3002`).

## What's here vs `anchor-frontend`

| Concern | `anchor-frontend` | `anchor-admin` |
|---------|------------------|----------------|
| Audience | Real user using Anchor | Founder/operator running Anchor |
| Backend port (proxied) | `:3001` | `:3002` |
| Vite port | `:3000` | `:3003` |
| Pages | Dashboard / Advisor / Twin / Memory / Sessions / Approvals / Workspace / Settings | Overview / Costs / Performance / Logs / Models / Agents / Crons / Jobs / Runs / Missions / Hooks / Permissions / Privacy / Graph / Memory / Data / Health / BridgesAdvanced |
| Network use | `/api/*` + `/ws` (WebSocket events) | `/api/*` only (no live WS — admin pulls via polling) |

## Page map

| Route | Page | Section |
|-------|------|---------|
| `/admin` | Overview | one-screen system health |
| `/admin/models` | Cortex | model + routing config |
| `/admin/costs` | Costs | LLM spend tracking |
| `/admin/performance` | Performance | latency + success rates |
| `/admin/logs` | Logs | LLM call inspector |
| `/admin/agents` | Agents | 12 system + N custom agents monitor |
| `/admin/crons` | AdminCrons | system cron schedule + snooze |
| `/admin/jobs` | Jobs | task-brain ledger (claim/retry/cancel) |
| `/admin/runs` | Runs | agent run list |
| `/admin/runs/:runId` | RunTrace | full ReAct trace for one run |
| `/admin/missions` | Missions | swarm mission viewer |
| `/admin/missions/:id` | MissionDetail | one mission's plan/agents |
| `/admin/hooks` | Hooks | user hooks on bus events |
| `/admin/permissions` | Permissions | trust state + L6 gate config |
| `/admin/privacy` | Privacy | LLM disclosure + delete data |
| `/admin/graph` | Graph | graph explorer |
| `/admin/memory` | Memory | memory stats |
| `/admin/data` | Data | export/import/batch ops |
| `/admin/health` | Health | DB / disk / cron health |
| `/admin/bridges-advanced` | BridgesAdvanced | bridge providers + capabilities |

## Quick start

```bash
pnpm install
pnpm dev                  # vite on :3003
```

Make sure `anchor-backend`'s **admin** server is running on `:3002`:
```bash
# in anchor-backend
pnpm dev:admin
```

Or run user + admin together:
```bash
# in anchor-backend
pnpm dev                  # both :3001 + :3002
```

## Architecture (admin separation)

```
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ User App (this is anchor-    │    │ Admin Panel (this repo →     │
│ frontend, port 3000 → 3001)  │    │ port 3003 → 3002)            │
└──────────────┬───────────────┘    └──────────────┬───────────────┘
               │                                    │
               └──────────────┬─────────────────────┘
                              │
                       ┌──────┴──────┐
                       │  anchor.db  │
                       │  SQLite WAL │
                       └─────────────┘
```

Two **separate processes** in `anchor-backend` (`server/index.ts` + `server/admin.ts`), one shared database. Admin reads what user product writes. Admin only writes to **config** tables (route_overrides, trust_state, system_*_overrides, etc.) — never to user data.

If the user product crashes, admin still works for diagnosis.

## Build

```bash
pnpm run build            # outputs dist/
pnpm run preview          # serve dist on :3003
```

## Related repos

- [`anchor`](https://github.com/123oqwe/anchor) — type contracts (spec)
- [`anchor-backend`](https://github.com/123oqwe/anchor-backend) — server (user + admin entries)
- [`anchor-frontend`](https://github.com/123oqwe/anchor-frontend) — user-facing UI
