# ZORA-WALAT PAYMENT & PROVIDER AUDIT — 2026-07-07

## Database provider and schema

| Item | Value |
|------|-------|
| Provider | PostgreSQL |
| ORM | Prisma |
| Schema | `server/prisma/schema.prisma` |
| Models | 33 |
| Migrations | 41 |

## Core money models — classification

| Model | Schema | Tests | Runtime proof | Classification |
|-------|--------|-------|---------------|----------------|
| `PaymentCheckout` | Yes | Integration + unit | L-89B staging order (narrow) | **IMPLEMENTED WITH TEST PROOF** (local/CI); staging runtime **PARTIAL** |
| `StripeWebhookEvent` | Yes | Chaos integration | L-89B signed webhook | **IMPLEMENTED WITH TEST PROOF** |
| `AuditLog` | Yes | `orderAuditTrail.test.js` | Staging logs (narrow) | **IMPLEMENTED WITH TEST PROOF** |
| `FulfillmentAttempt` | Yes | Phase1 integration | L-89B skip breadcrumb | **IMPLEMENTED WITH TEST PROOF** |
| `CanonicalTransaction` | Yes | Sync/projection tests | **NOT PROVEN** live | **IMPLEMENTED WITH TEST PROOF** (mirror) |
| `LedgerJournalEntry` | Yes | Ledger + integration | **NOT PROVEN** production money | **IMPLEMENTED WITH TEST PROOF** |

## Payment system topics

| Topic | Classification | Evidence |
|-------|----------------|----------|
| Duplicate transaction prevention | **IMPLEMENTED WITH TEST PROOF** | `idempotencyService.js`, `StripeWebhookEvent` PK, integration chaos |
| Idempotency keys | **IMPLEMENTED WITH TEST PROOF** | `PaymentCheckout.idempotencyKey`, kernel tests |
| Webhook signature verification | **IMPLEMENTED WITH TEST PROOF** | `stripeWebhookSignatureRejection.test.js`, slim handler |
| Webhook replay protection | **IMPLEMENTED WITH TEST PROOF** | Event ID dedup; L-89B no duplicate dispatch proof |
| Checkout session creation | **IMPLEMENTED WITH TEST PROOF** | Integration tests; L-89B `cs_test_*` |
| Payment success handling | **IMPLEMENTED WITH TEST PROOF** | `phase1StripeCheckoutSessionCompleted.js`, slim handler tests |
| Failed payment handling | **IMPLEMENTED WITH TEST PROOF** | `payment_intent.payment_failed` route |
| Refund handling | **PARTIAL** | `charge.refunded` handler + tests; Phase 1 doc: **manual** in-app refund |
| No-pay-no-service | **IMPLEMENTED WITH TEST PROOF** | `test/noPayNoServiceProof.test.js`, fulfillment guards |
| Fulfillment gating | **IMPLEMENTED WITH TEST PROOF** | `paymentFulfillmentGuard.js`, outbound policy |
| Provider call gating | **IMPLEMENTED WITH TEST PROOF** | `fulfillmentOutboundPolicy.js`, mock adapter |
| Service without confirmed payment | **BLOCKED BY DESIGN** | Tests + guards — production bypass **NOT PROVEN** |
| Double charge / double fulfillment | **MITIGATED IN TESTS** | Idempotency + webhook dedup — live **NOT PROVEN** |

## Stripe classification

| Claim | Status | Evidence |
|-------|--------|----------|
| Test mode checkout | **SANDBOX ONLY** | L-89B `cs_test_*`, staging env |
| Live Stripe account | **NOT PROVEN** | No live key proof in repo |
| Live webhook | **NOT PROVEN** | |
| Real money settlement | **NO-GO** | `REAL_MONEY_PASS=NO` |

## Provider — Reloadly / airtime

| Claim | Status | Evidence |
|-------|--------|----------|
| Provider code integrated | **CONFIG ONLY** | `reloadlyClient.js`, `deliveryAdapter.js` |
| Sandbox OAuth/topup | **NOT PROVEN** | `proof:reloadly:live` not executed in program |
| Staging runtime | **MOCK ONLY** | L-89B deploy logs |
| Staging cred env names | **MISSING** | L-90B2 Vercel name list |
| Operator map (staging) | **CONFIG ONLY** | Code defaults `911xxx` placeholders |
| Provider contract / SLA | **NOT PROVEN** | No external contract in repo |
| Reloadly support ticket | **BLOCKED_EXTERNAL** | Ticket `46249867603` — operator stated |
| Production provider proof | **NO-GO** | `PROVIDER_PASS=NO` |

## Provider — Web top-up

| Item | Status |
|------|--------|
| `WEBTOPUP_FULFILLMENT_PROVIDER` | Name on Vercel; value **UNKNOWN** |
| `webtopup-reloadly-sandbox-verify.mjs` | No-HTTP readiness script |
| Live dispatch | **NOT PROVEN** |

## Mock / demo / fake logic

| Component | Path | Purpose |
|-----------|------|---------|
| `mockAirtimeProvider.js` | Fulfillment | No external HTTP |
| `AIRTIME_PROVIDER=mock` | Staging runtime | Proven L-89B |
| `proof-reloadly-dry-run` | Script | Mock adapter in tests |
| Placeholder operator IDs | `reloadlyOperatorIdDefaults.js` | `911001–911005` — not catalog-verified |

## Provider claim classification summary

```
REAL PROVIDER PROVEN     = NO
SANDBOX ONLY             = NOT PROVEN (no OAuth/topup proof)
MOCK ONLY                = YES (staging runtime proven)
CONFIG ONLY              = YES (code + env names partial)
NOT PROVEN               = live provider, contract, catalog IDs
UNSAFE CLAIM             = any "provider integrated" marketing without proof
```

## Payment claim classification summary

```
PAYMENT_PASS             = NO (narrow sandbox only per L-89B — not real money)
WEBHOOK_PASS             = YES_NARROW_SANDBOX_SIGNED_WEBHOOK_ON_B2B_ORDER (conversation lock)
REAL_MONEY_PASS          = NO
```

---

*Audit-only. No provider HTTP performed.*
