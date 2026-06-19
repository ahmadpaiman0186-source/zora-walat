# L-85M-R1 — Tracked route surface inventory

**Source:** tracked `main` @ `e02b8e2` — static read-only

---

## Vercel configuration

| File | Role |
|------|------|
| `vercel.json` (root) | Next.js framework; rewrites for health, ready, stripe webhook, checkout |
| `server/vercel.json` | Catch-all `/(.*)` → `server/api/index.mjs` |

## Root `api/` bridges (root deploy only)

| Handler | Path served | Delegates to |
|---------|-------------|--------------|
| `api/health-ready.mjs` | `/health`, `/ready` (via rewrite + `?route=`) | Slim liveness / `handleSlimReady` |
| `api/webhooks/stripe.mjs` | `/webhooks/stripe` (via rewrite) | `slimStripeWebhookHandler.mjs` + Express replay |
| `api/create-checkout-session.mjs` | `/create-checkout-session` | Checkout bridge |

**Absent at root:** `api/` bridge for `/ops/*` or `db-readonly-proof`.

## Server entrypoint (`server/api/index.mjs`)

Pre-bootstrap fast paths (before full Express):

| Method | Path | Handler |
|--------|------|---------|
| GET | `/health`, `/api/health`, `/` | Liveness JSON |
| GET | `/ready`, `/api/ready` | `handleSlimReady` |
| GET | `/ops/db-readonly-proof`, `/api/admin/ops/db-readonly-proof` | `slimDbReadonlyProofPrebootstrapHandler` (L-85P) |
| POST | `/webhooks/stripe` | `slimStripeWebhookHandler` |
| GET/HEAD | `/api/index` | Probe OK |
| * | *(default)* | `getHandler()` → Express via `serverless-http` |

## Express app registrations (`server/src/app.js`)

| Mount | Router / handler |
|-------|------------------|
| `/webhooks/stripe` | Raw body + Stripe webhook routes |
| `healthRoutes` | `/`, `/health`, `/metrics`, `/ready` |
| `/ops`, `/api/admin/ops` | `ops.routes.js` |

## Key ops routes (`server/src/routes/ops.routes.js`)

| Route | Purpose |
|-------|---------|
| `GET /ops/health` | Infra health (token gate under prelaunch) |
| `GET /ops/db-readonly-proof` | Read-only DB identity proof (`executeDbReadonlyProof`) |
| *(admin alias)* | Same router at `/api/admin/ops/*` |

## Webhook routes (`server/src/routes/stripeWebhook.routes.js`)

| Event path | Money-path handling |
|------------|---------------------|
| `POST /webhooks/stripe` | Signature verify → `$transaction` → dispute/refund/checkout handlers |

---

*End.*
