# CORE-05 Integration Boundary

**Date:** 2026-05-29

---

## v1 status: NOT WIRED

`server/src/reliability/idempotencyKernel/` is **exported only**. No imports from:

- `paymentController` / checkout routes  
- `stripeWebhook.routes.js`  
- `reloadlyClient.js` / fulfillment dispatch  
- Wallet top-up handlers  
- Refund/reversal flows  

Live checkout/payment/provider/webhook behavior is **unchanged**.

---

## Future integration points (approval required)

| Surface | Hook | Expected input |
|---------|------|----------------|
| Checkout creation | Before `createCheckoutSession` | `AttemptContext` + DB-backed registry |
| Stripe webhook | Before handler mutation | `eventId` + idempotency row |
| Order creation | Before persist | `clientKey` / `orderId` |
| Provider fulfillment | Before HTTP POST | `buildProviderAttemptKey` + registry |
| Wallet mutation | Before credit | `walletIntentId` header |
| Refund/reversal | Before Stripe refund API | refund scope key |

Each integration must:

1. Call `classifyIdempotencyAttempt` **before** mutation  
2. On non-`ALLOW`, return safe HTTP/error without side effects  
3. Never auto-apply `RETRY_SAFE` without explicit ops policy  
4. Keep `mutationAllowed` false in kernel (execution layer separate)

---

## Registry v1 vs production

| v1 | Production (future) |
|----|---------------------|
| In-memory `Map` | Redis / DB idempotency table |
| Fixture seeds | StripeWebhookEvent + FulfillmentAttempt rows |
| Tests only | Horizontal scaling via REDIS_URL (see deployment contract) |

---

## CORE-04 relationship

Runtime doctor duplicate scanners remain **detect-only** on snapshots. CORE-05 kernel is **pre-execution**. Convergence is a future track; not implemented.

---

*End of boundary.*
