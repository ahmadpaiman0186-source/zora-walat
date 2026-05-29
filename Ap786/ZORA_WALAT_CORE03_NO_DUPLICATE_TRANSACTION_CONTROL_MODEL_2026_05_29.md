# CORE-03 No Duplicate Transaction Control Model

**Date:** 2026-05-29  
**Status:** **CONTROL MODEL (source-informed) — NOT VERIFIED end-to-end**

---

## 1. Definition

**Duplicate transaction** = any customer-visible or ledger-visible **second** financial or fulfillment effect for the **same logical intent** (same checkout idempotency key, same Stripe event id, same provider custom identifier / attempt contract, or same wallet top-up idempotency key).

---

## 2. Control planes

| Plane | Mechanism (source) | Layer |
|-------|-------------------|-------|
| **Stripe webhook** | `StripeWebhookEvent.id` PK; P2002 → ack; Redis shadow fast path | L2 |
| **Hosted checkout** | `PaymentCheckout.idempotencyKey` UNIQUE; reuse lookup | L1 |
| **Wallet top-up** | Header `Idempotency-Key` UUID; conflict codes in health contract | L1 |
| **Reloadly POST** | `customIdentifier` per `FulfillmentAttempt`; idempotency registry | L0 |
| **BullMQ job** | `jobId` tied to `orderId` (replay discipline doc) | L2 |
| **WebTopup order** | Topup idempotency + binding conflict (`topupOrderPayload`) | L1 parallel |

---

## 3. Rules

| Rule ID | Rule |
|---------|------|
| ND-01 | Same Stripe `event.id` must not apply paid/fulfill side effects twice |
| ND-02 | Same checkout `Idempotency-Key` must return same session/row or safe 409 |
| ND-03 | Same wallet idempotency key must not double-credit |
| ND-04 | Provider retry must reuse idempotency contract or open **new** attempt with explicit policy |
| ND-05 | Admin / auto-retry must not mint unbounded new provider sends for same paid order |
| ND-06 | Reconciliation must flag duplicate provider references for one checkout |

---

## 4. Failure modes (duplicate family)

| FM | Detection | Safe response |
|----|-----------|---------------|
| FM-04 Duplicate webhook | `stripe_webhook_duplicate_*` metrics / P2002 | 200 ack, no double fulfill |
| FM-05 Duplicate checkout | `idempotency_hit` log | Return existing URL |
| FM-06 Duplicate provider | Registry hit / duplicate txn at provider | Stop POST; inquiry |
| FM-12 Wallet mismatch | Ledger reason mismatch | Fail-closed; ops |

See [auto-detection matrix](./ZORA_WALAT_CORE03_AUTO_DETECTION_SIGNAL_MATRIX_2026_05_29.md).

---

## 5. Source review verdict

| Control | Code present? | Runtime proven? |
|---------|---------------|---------------|
| Webhook dedupe | **YES** | **NOT VERIFIED** (staging replay inconclusive per program) |
| Checkout idempotency | **YES** | **NOT VERIFIED** |
| Reloadly registry | **YES** | **NOT VERIFIED** |
| End-to-end zero duplicate | — | **NOT VERIFIED** |

**Duplicate provider prevention: NOT VERIFIED** (partial code evidence only).

---

## 6. Future doctor scanners (CORE-04)

| Scanner | Query |
|---------|-------|
| `duplicate_stripe_event` | Multiple rows same event id (should be impossible) |
| `duplicate_checkout_idem` | Multiple PAID rows same idempotency key |
| `duplicate_fulfillment_attempt` | Same attempt id two SUCCESS provider refs |
| `duplicate_wallet_credit` | Ledger duplicate reason window |

**Mutations: forbidden in v1.**

---

## 7. NO-GO

| Claim | Status |
|-------|--------|
| Zero duplicate risk | **NOT CLAIMED** |
| Model filed | **YES** |

---

*End of no-duplicate model.*
