# L-85M-R2A — No-mutation implementation blueprint

**For L-85M-R2B only — no files changed in R2A**

---

## Files likely to change in R2B

| File | Change type |
|------|-------------|
| `vercel.json` | Add 2 rewrite entries (append) |
| `api/ops/db-readonly-proof.mjs` | **New** — root bridge |
| `api/ops/health.mjs` | **New** — root bridge |
| *(optional)* `server/scripts/verify-str02-root-vercel-route.mjs` | Extend checks for ops rewrites (no webhook regression) |
| *(optional)* `Ap786/evidence/L85M-R2B/*` | Mutation attestation + static verify report |

**Must NOT change in R2B minimal scope:**

- `api/webhooks/stripe.mjs`
- `server/api/index.mjs` runtime logic
- `server/src/routes/stripeWebhook.routes.js`
- Payment / dispute behavior

---

## Intended public paths after mutation

| Public path | Method | Expected first-hop behavior (no token) |
|-------------|--------|----------------------------------------|
| `/ops/db-readonly-proof` | GET | **401 JSON** fail-closed (L-85P pre-bootstrap) — **not 404 HTML** |
| `/ops/health` | GET | **503** prelaunch lockdown or token-gated JSON per `opsInfraHealthGate` — **not 404 HTML** |
| `/webhooks/stripe` | POST | Unchanged — invalid sig **400** / verified path unchanged |
| `/health` | GET | Unchanged — **200** JSON |

---

## Pre-deploy checks (R2B gate)

| # | Check |
|---|--------|
| 1 | `npm run verify:str02-route` — webhook rewrite still PASS |
| 2 | `npm --prefix server run secrets:scan` |
| 3 | Local static review — no catch-all rewrite added |
| 4 | Bridge files import server handlers only — no new payment/DB mutation logic |
| 5 | `git diff --check` |

---

## Post-merge sequence (separate authorized gates)

| Gate | Action | Authorization |
|------|--------|---------------|
| **R2B** | Tracked mutation only — **no deploy** | Operator (implementation) |
| **R3** | Deploy pickup proof — deployment metadata observed | **Separate** |
| **R4** | Live structural probe — `GET /ops/db-readonly-proof` → **401 JSON** (no token) | **Separate** — no DB proof |
| **R5** | L-85M retry — authenticated read-only DB identity proof | **Separate** — after R4 PASS |
| **R6** | Webhook runtime proof | **Separate** — not required for L-85M |

---

## Success criteria (static + later live)

| Criterion | When verified |
|-----------|---------------|
| Ops rewrites present in `vercel.json` | R2B merge |
| STR-02 webhook checks still PASS | R2B local |
| Staging `/ops/db-readonly-proof` ≠ 404 HTML | **R4** (not R2A/R2B alone) |
| L-85M PASS | **R5** only |

---

*End.*
