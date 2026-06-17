# L-85O — Deploy root correction attestation

---

## Pre-correction state (L-85N / L-85M diagnosis)

| Signal | Value |
|--------|--------|
| Vercel project Root Directory (inspect) | **`.`** (repository root) |
| Active deployment builds (pre) | Next.js-style (`index`, `*.rsc`) — **not** `api/index` |
| `/ops/db-readonly-proof` | **404 HTML** |

## Correction actions (L-85O)

| Action | Result |
|--------|--------|
| `vercel link` from `server/` → `zora-walat-api-staging` | **YES** |
| `npm run deploy:staging:guard` | **PASS** |
| `vercel deploy --prod --yes` from `server/` | **YES** |
| API PATCH Root Directory → `server` | **FAILED** — Vercel auth file not available to agent script |

## Post-correction project settings (inspect)

| Field | Value |
|-------|--------|
| Root Directory (project setting) | **`.`** — **unchanged** |
| Framework Preset | Other |

**Note:** Git-connected future builds may revert to root deploy until operator sets Root Directory = **`server`** in Vercel UI.

## Post-correction deployment builds (inspect)

| Build artifact | Status |
|----------------|--------|
| `λ api/index` | **YES** — API serverless entry live |

## Root directory attestation

| Question | Answer |
|----------|--------|
| Root directory confirmed/corrected in Vercel UI | **NO** — project setting still `.` |
| Active deployment corrected via `server/` CLI deploy | **YES** |
| Root directory value (intended) | **`server`** |
| Root directory value (project setting) | **`.`** |

---

*End.*
