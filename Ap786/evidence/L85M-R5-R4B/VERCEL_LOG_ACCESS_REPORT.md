# L-85M-R5-R4B — Vercel log access report

**Gate UTC:** 2026-06-21

---

## Access posture

| Field | Value |
|-------|--------|
| Logs CLI reachable | **YES** |
| Auth blocked | **NO** — `vercel whoami` → authenticated user (username only; not recorded here) |
| Classification | **`VERCEL_LOGS_UNAVAILABLE_OR_INSUFFICIENT`** (not `VERCEL_LOGS_ACCESS_BLOCKED`) |

## Tooling

| Field | Value |
|-------|--------|
| CLI | Vercel CLI (`vercel.cmd`, npm global) |
| Working directory | `server/` (linked `.vercel/project.json`) |
| Project | **`zora-walat-api-staging`** |
| Project ID | `prj_cEfwYIsWRcJ4BLz5bcCwc8A5jCeY` |
| Org ID | `team_41v4c37X9wFOHprAoOsw2jc1` |

## Commands attempted (summary)

| # | Command pattern | Outcome |
|---|-----------------|---------|
| 1 | `vercel ls zora-walat-api-staging` | **OK** — deployment list returned |
| 2 | `vercel inspect …-jeku6t6ta.vercel.app` | **OK** — `dpl_E1qVq7vcY22e7tU71hGwbjb7N3wD`, target `production`, **READY** |
| 3 | `vercel logs --project … --since 2026-06-21T07:38:15Z --until 2026-06-21T08:18:15Z -j` | **HTTP 400** — no JSON lines |
| 4 | `vercel logs --project … --since 2026-06-21T07:38:00Z -j` | **Empty** — fetch completed, **0 JSON lines** |
| 5 | `vercel logs --project … --query "db-readonly-proof" --since 2026-06-21T07:30:00Z -j` | **Empty** — **0 JSON lines** |
| 6 | `vercel logs --project … --status-code 503 --since 2026-06-21T07:30:00Z -j` | **Empty** — **0 JSON lines** |
| 7 | `vercel logs --project … --source serverless -n 100 -j` | **Empty** — **0 JSON lines** |
| 8 | `vercel logs --deployment dpl_E1qVq7vcY22e7tU71hGwbjb7N3wD -n 500 -j --expand` | **Empty** — **0 JSON lines** |
| 9 | `vercel logs …-jeku6t6ta.vercel.app -n 200 -j` | **Empty** — **0 JSON lines** |

## Not used

| Method | Status |
|--------|--------|
| `vercel env pull` / `get` | **NOT USED** |
| Endpoint retry for log generation | **NOT USED** |
| Token use | **NOT USED** |
| Raw log blob commit | **NOT USED** |

---

*End.*
