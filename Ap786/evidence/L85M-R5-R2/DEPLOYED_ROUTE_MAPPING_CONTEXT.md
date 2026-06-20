# L-85M-R5-R2 — Deployed route mapping context

**Gate UTC:** 2026-06-20  
**Source:** committed evidence + tracked `vercel.json` on `main`

---

## Route mapping (tracked `main`)

| Layer | Mapping |
|-------|---------|
| Public path | `/ops/db-readonly-proof` |
| Vercel rewrite | → `/api/ops/db-readonly-proof` |
| Serverless entry | `api/ops/db-readonly-proof.mjs` |
| Internal Express path | `/ops/db-readonly-proof` (URL rewritten in bridge) |

## Prior deployment pickup (L-85M-R3)

| Field | Value |
|-------|--------|
| Route mapping merge | PR #293 → `39e784d` / FIX1 `9077765` |
| Pickup metadata | **`DEPLOYMENT_PICKUP_METADATA_OBSERVED=YES`** |
| Endpoint structural proof | L-85M-R4 **PASS** (401 not 404) |

## Auth rejection vs deployment staleness

| Observation | Implication |
|-------------|-------------|
| R4 + R5-R1 both hit `/api/ops/db-readonly-proof` | Current staging artifact includes L-85M-R2B bridge + L-85P guard |
| R5-R1 auth rejected | **Not** explained by missing route mapping on deployed staging |
| Code/env drift | Possible for **env vars** without route redeploy — not proven here |

**Assessment:** **`DEPLOYMENT_STALENESS_LIKELY` — LOW** for route/auth-code mismatch. Env misalignment remains **HIGH** (separate dimension).

---

*End.*
