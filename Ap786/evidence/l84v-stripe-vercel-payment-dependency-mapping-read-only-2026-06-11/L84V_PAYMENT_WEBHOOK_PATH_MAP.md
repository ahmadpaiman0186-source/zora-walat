# L-84V — Payment and webhook path map

**Verdict:** `CORE10-L84V-VERDICT-001: L84V_PAYMENT_DEPENDENCY_MAP_COMPLETED_READ_ONLY_EXECUTION_STILL_BLOCKED`

## HTTP routes (server)

| Method | Path | Auth | Stripe dependency |
|--------|------|------|-----------------|
| **POST** | `/create-checkout-session` | JWT (authenticated) | **`STRIPE_SECRET_KEY`** — creates Checkout Session |
| **POST** | `/checkout-pricing-quote` | JWT | Pricing quote path |
| **POST** | `/webhooks/stripe` | Stripe signature header | **`STRIPE_WEBHOOK_SECRET`** + **`STRIPE_SECRET_KEY`** (client for enrichment) |

## Mount order (critical for webhooks)

| File | Note |
|------|------|
| `server/src/app.js` | `/webhooks/stripe` registered **before** `express.json()` — raw body preserved for signature verification |

## Webhook event processing chain (high level)

```
POST /webhooks/stripe
  → stripeWebhook.routes.js (signature verify)
  → slimStripeWebhookHandler / phase handlers
  → webtopupWebhookHandlers / phase1StripeCheckoutSessionCompleted
  → DB: stripeWebhookEvent, order state transitions
```

## Documented staging webhook URL (Ap786 — not HTTP-tested in L-84V)

| URL | Source |
|-----|--------|
| `https://zora-walat-api-staging.vercel.app/webhooks/stripe` | Ap786 STR02/STR09 webhook docs |

## Payment flow dependency summary

| Stage | Breaks if `STRIPE_SECRET_KEY` invalid/revoked | Breaks if `STRIPE_WEBHOOK_SECRET` mismatch |
|-------|-----------------------------------------------|---------------------------------------------|
| Checkout session creation | **YES** | N/A |
| Stripe API calls (fees, PI retrieve) | **YES** | N/A |
| Webhook delivery processing | Partial (verify fails first) | **YES** |
| Fallback poller | **YES** | N/A |
| Order fulfillment after paid webhook | Indirect (webhooks fail) | **YES** |

## L-84P path (separate — not payment)

| Method | Path | Token env |
|--------|------|-----------|
| **GET** | `/ops/health` | **`OPS_HEALTH_TOKEN`** — not **`STRIPE_SECRET_KEY`** |

---

*End.*
