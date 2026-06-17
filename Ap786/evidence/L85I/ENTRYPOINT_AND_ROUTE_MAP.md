# L-85I — Entrypoint and route map

Structural map from tracked `server/api/index.mjs`, `server/src/app.js`, root `vercel.json`, root `api/**`.

---

## A) Vercel routing topology

```
Monorepo
├── ./ (root vercel.json — Next.js)
│   ├── Rewrites → api/health-ready.mjs (health/ready)
│   ├── Rewrites → api/webhooks/stripe.mjs
│   └── Rewrites → api/create-checkout-session.mjs
│
└── server/ (server/vercel.json — API)
    └── All paths → server/api/index.mjs
```

---

## B) `server/api/index.mjs` — slim pre-bootstrap routes

Handled **before** `getHandler()` (no full Express cold start):

| Method | Path pattern | Handler module |
|--------|--------------|----------------|
| GET | `/`, `/health`, `/api/health` | inline liveness JSON |
| GET | `/success`, `/cancel` | `slimCheckoutReturnHandler.mjs` |
| GET | `/ready`, `/api/ready` | `slimReadyHandler.mjs` (owner DB core probe) |
| GET/HEAD | `/api/index`, `/index` | API index probe |
| POST | `/webhooks/stripe` | `slimStripeWebhookHandler.mjs` |
| POST | `/api/auth/login`, `/auth/login` | `slimAuthLoginHandler.mjs` |
| POST | `/api/auth/register`, `/auth/register` | `slimAuthRegisterHandler.mjs` |
| POST | `/api/auth/request-otp`, `/auth/resend-otp`, … | `slimAuthRequestOtpHandler.mjs` |
| POST | `/api/ops/staging-verify-operator-email` | `slimStagingOperatorVerifyEmailHandler.mjs` |
| GET | `/api/ops/staging-operator-order-status/*` | `slimStagingOperatorOrderStatusHandler.mjs` |
| GET | `/api/ops/staging-operator-phase1-truth/*` | `slimStagingOperatorPhase1TruthHandler.mjs` |
| GET | `/api/ops/staging-operator-refundable-candidates` | `slimStagingOperatorRefundableCandidatesHandler.mjs` |
| GET | `/api/ops/staging-operator-refund-target/*` | `slimStagingOperatorRefundTargetHandler.mjs` |
| POST | `/api/create-checkout-session`, `/create-checkout-session` | `slimCreateCheckoutHandler.mjs` (Bearer) |

All other traffic → `getHandler()` → Express app (`server/src/app.js`).

---

## C) Root `api/health-ready.mjs`

| Query `route=` | Behavior |
|----------------|----------|
| `health` | Imports `sendLivenessJsonOk` — no DB |
| `ready` | Imports `handleSlimReady` — owner DB probe |

Used when staging builds from repo root (comment in file: `server/api/index.mjs` not exposed on that deploy shape).

---

## D) Express mounts — `server/src/app.js` (selected infra)

| Mount prefix | Router module | Notable routes |
|--------------|---------------|----------------|
| (root) | `health.routes.js` | `/health`, `/ready`, `/metrics` |
| `/ops`, `/api/admin/ops` | `ops.routes.js` | `/health`, staff ops reports |
| `/internal` | `internalShadowSafetyGateStagingProbe.routes.js` | `POST …/staging/shadow-safety-gate/diagnostic-probe` |
| `/internal` | `internalPhase1MissionMetrics.routes.js` | token-gated metrics |
| `/internal` | `internalWebtopupLogs.routes.js` | token-gated logs |
| `/webhooks/stripe` | `stripeWebhook.routes.js` | full webhook processing |
| `/api/*` | various | payments, wallet, admin, catalog, … |

---

## E) DB-touching probe summary

| Route | DB client | Queries (structural) |
|-------|-----------|------------------------|
| Slim `/ready` | owner `prisma` | `SELECT 1`; readiness core may include `webTopupOrder.findFirst` in Express path |
| Express `/ready` | owner `prisma` | core + extended aggregates |
| `/ops/health` | owner `prisma` | `SELECT 1` |
| Staging operator slim GETs | owner `prisma` | business-table SELECT (JWT auth) |

**None** use `READ_ONLY_DATABASE_URL`. **None** expose `current_user` or write-privilege denial proof.

---

## F) Operator CLI (not runtime HTTP)

| Tool | Path |
|------|------|
| zw-doctor | `server/tools/zw-doctor.mjs` |
| Staging checkout operator | `server/tools/staging-auth-checkout-operator.mjs` |

Documented for completeness — **not** deployment entrypoints.

---

*End.*
