# L-85M-R2B — Ops route expected behavior

**Gate UTC:** 2026-06-19

**Note:** Expected behavior after **future deploy** — **not proven in R2B**.

---

## `GET /ops/db-readonly-proof`

| Stage | Expected behavior (from existing server logic) |
|-------|------------------------------------------------|
| Root rewrite | `/ops/db-readonly-proof` → `/api/ops/db-readonly-proof` |
| Bridge | Pre-bootstrap guard via `handleSlimDbReadonlyProofPrebootstrapGet` |
| Missing/invalid token | **401** (pre-bootstrap fail-closed) — not 404 |
| Valid token + configured read-only URL | Pass-through to `executeDbReadonlyProof` via Express |

Authority: `server/handlers/slimDbReadonlyProofPrebootstrapHandler.mjs`, `server/src/routes/ops.routes.js`, `server/api/index.mjs` L116–127.

## `GET /ops/health`

| Stage | Expected behavior (from existing server logic) |
|-------|------------------------------------------------|
| Root rewrite | `/ops/health` → `/api/ops/health` |
| Bridge | Express pass-through to ops router `/health` |
| Prelaunch lockdown | May return **503** without `OPS_HEALTH_TOKEN` (existing gate) |
| Normal | JSON payload with `server`, `db`, `redis`, `queue` flags |

Authority: `server/src/routes/ops.routes.js`, `server/src/middleware/opsInfraHealthGate.js`.

## Not in R2B scope

- Live 401/503/200 verification (requires R4 deploy + endpoint proof gates)
- L-85M authenticated DB identity proof (requires R5 + explicit authorization)

---

*End.*
