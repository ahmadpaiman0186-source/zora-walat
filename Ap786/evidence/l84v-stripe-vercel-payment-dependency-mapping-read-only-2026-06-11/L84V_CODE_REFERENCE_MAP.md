# L-84V — Code reference map

**Verdict:** `CORE10-L84V-VERDICT-001: L84V_PAYMENT_DEPENDENCY_MAP_COMPLETED_READ_ONLY_EXECUTION_STILL_BLOCKED`

Read-only map from tracked repository. **No secret values.**

## Stripe SDK initialization

| File | Function / export | Dependency |
|------|-------------------|------------|
| `server/src/config/stripeEnv.js` | `getValidatedStripeSecretKey()`, `effectiveStripeSecretKey()` | **`STRIPE_SECRET_KEY`** (env or gitignored `stripe_secret.key` file) |
| `server/src/services/stripe.js` | `getStripeClient()` | Stripe SDK client from validated secret key |
| `server/bootstrap.js` | env load | Loads `server/.env` before runtime |

## Checkout / payment session creation

| File | Route / symbol | Dependency |
|------|----------------|------------|
| `server/src/routes/payment.routes.js` | `POST /create-checkout-session` | Stripe client → **`STRIPE_SECRET_KEY`** |
| `server/src/routes/payment.routes.js` | `POST /checkout-pricing-quote` | Pricing path (authenticated) |
| `server/src/validators/checkoutSchema.js` | checkout schemas | Input validation layer |
| `server/src/services/paymentCheckoutStripeFeeService.js` | fee logic | Stripe fee estimation |

## Webhook ingestion

| File | Route / symbol | Dependency |
|------|----------------|------------|
| `server/src/app.js` | mounts `POST /webhooks/stripe` | Raw body + rate limit |
| `server/src/routes/stripeWebhook.routes.js` | webhook handler | **`STRIPE_WEBHOOK_SECRET`**, Stripe client |
| `server/api/slimStripeWebhookHandler.mjs` | Vercel/serverless bridge | Same signing contract |
| `server/src/services/phase1StripeCheckoutSessionCompleted.js` | event handler | Payment truth / order state |
| `server/src/services/topupOrder/webtopupWebhookHandlers.js` | PI webhook handlers | Order fulfillment path |

## Webhook fallback / polling

| File | Symbol | Dependency |
|------|--------|------------|
| `server/src/services/topupOrder/webtopupStripeFallbackPoller.js` | fallback poller | Stripe client when webhooks missing |

## Preflight / readiness (names only)

| File | Role |
|------|------|
| `server/src/config/stripeLiveReadinessPreflight.js` | Validates **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, mode guards |
| `server/scripts/stripe-staging-preflight-booleans.mjs` | Boolean presence checks (no values logged in design) |

## Ops infra (not Stripe — separate blast radius)

| File | Symbol | Dependency |
|------|--------|------------|
| `server/src/middleware/opsInfraHealthGate.js` | ops gate | **`OPS_HEALTH_TOKEN`** / alias **`OPS_INFRA_HEALTH_TOKEN`** |
| `server/src/routes/ops.routes.js` | `/ops/health` | Ops token gate under lockdown |

## Frontend (separate surface)

| Reference | Env name |
|-----------|----------|
| `.env.local.example`, README | **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** |

---

*End.*
