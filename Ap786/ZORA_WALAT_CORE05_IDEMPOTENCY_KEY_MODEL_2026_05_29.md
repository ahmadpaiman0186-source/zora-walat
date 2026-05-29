# CORE-05 Idempotency Key Model

**Date:** 2026-05-29

---

## Canonical format

```
v1|<scope>|<source>|<type>|<anchors...>
```

Anchors (zero or more, scope-dependent): `clientKey`, `orderId`, `userId`, `eventId`, `attemptId`, `providerReference`, `paymentIntentId`, `walletIntentId`.

Implementation: `server/src/reliability/idempotencyKernel/keyModel.js`

---

## Scopes

| Scope | Use |
|-------|-----|
| `checkout` | Stripe Checkout session creation |
| `webhook` | Stripe webhook delivery |
| `provider_attempt` | Reloadly / provider dispatch |
| `wallet` | Wallet top-up intent |
| `refund` | Refund/reversal (future) |
| `order_retry` | Status poll / reconcile retry |

---

## Sources

`client` | `stripe` | `internal` | `provider` | `system`

---

## Validation (fail-closed)

| Rule | On violation |
|------|----------------|
| Missing scope/source/type | Reject → `BLOCK_AMBIGUOUS` |
| No entity anchor | Reject → `BLOCK_AMBIGUOUS` |
| Checkout without `clientKey` or `orderId` | Reject |
| Webhook without `eventId` | Reject |
| Provider attempt without `orderId` or `attemptId` | Reject |
| Wallet without `walletIntentId` or `clientKey` | Reject |

---

## Payment-safe / provider-safe boundaries

- Keys use **normalized opaque ids** only (order id, attempt id, event id).  
- **Never** embed PAN, CVV, API secrets, webhook signing secrets, or raw provider tokens.  
- `buildProviderAttemptKey` aligns with internal `zwr_{attemptId}` / `{orderId}_a{n}` naming (spec reference only; no provider call).

---

## Normalization

`normalizeKeyPart`: trim, collapse whitespace to `_`, max 128 chars per segment.

---

*End of key model.*
