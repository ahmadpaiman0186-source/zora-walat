# CORE-03 Failure Mode And Invariant Model

**Date:** 2026-05-29  
**Status:** **SPECIFICATION + SOURCE-INFORMED GAPS**  
**Detection detail:** [Auto-detection matrix](./ZORA_WALAT_CORE03_AUTO_DETECTION_SIGNAL_MATRIX_2026_05_29.md)

---

## 1. Hard invariants

| ID | Invariant | Violation symptom | Source hint (read-only) |
|----|-----------|-------------------|-------------------------|
| **INV-01** | No duplicate transaction | Double charge, double fulfill | `StripeWebhookEvent`, `idempotencyKey`, Reloadly registry |
| **INV-02** | No delivery without provider success proof | User sees success, MNO has no credit | `FULFILLED` transition, Reloadly classify helpers |
| **INV-03** | No charge without service path proof | Paid row, no fulfillment attempt | `PAID` without `FulfillmentAttempt` |
| **INV-04** | No provider retry without idempotency boundary | Duplicate top-up at MNO | `customIdentifier`, new attempt row |
| **INV-05** | No terminal order without audit trail | Support cannot reconstruct | `writeOrderAudit` |
| **INV-06** | No ambiguous provider → completed | HTTP 200 without txn id → FULFILLED | Reloadly body classifiers |
| **INV-07** | No auto-repair money/provider mutation without approval | Silent refund / re-send | `moneyPathDriftRepair.js` gated |

**Runtime enforcement of all invariants: NOT VERIFIED.**

---

## 2. Failure mode catalog

| FM-ID | Failure mode | Primary layer |
|-------|--------------|---------------|
| FM-01 | Payment succeeded, provider failed | L0 + L2 |
| FM-02 | Provider succeeded, order not updated | L0 + L2 |
| FM-03 | Provider timeout / ambiguous response | L0 |
| FM-04 | Duplicate webhook | L2 |
| FM-05 | Duplicate checkout session | L1 |
| FM-06 | Duplicate provider execution | L0 |
| FM-07 | Stale pending order | L2 |
| FM-08 | Missing provider reference | L0 + L5 audit |
| FM-09 | Completed order without provider proof | L2 |
| FM-10 | User charged without service | L1 + L0 |
| FM-11 | Service delivered without confirmed provider success | L2 |
| FM-12 | Wallet / order / payment mismatch | L1 |
| FM-13 | Audit log missing | L5 |
| FM-14 | Sandbox / live mode confusion | L4 env |
| FM-15 | Operator error (manual admin action) | L4 |

---

## 3. Failure mode narratives

### FM-01 — Payment succeeded, provider failed

Stripe marks paid; Reloadly POST fails or returns terminal failure. Order may sit **PROCESSING** or **FAILED**. **Must not** show **FULFILLED**. Recovery: bounded retry, inquiry, manual review — see [failover boundary](./ZORA_WALAT_CORE03_SAFE_FAILOVER_AND_RETRY_BOUNDARY_2026_05_29.md).

### FM-02 — Provider succeeded, order not updated

Provider ledger shows SUCCESSFUL; DB still **PROCESSING**. Reconciliation engine may flag (`phase1MoneyFulfillmentReconciliationEngine.js` references payment/fulfillment drift). **Detection required** before customer comms.

### FM-03 — Provider timeout / ambiguous response

Unknown outcome at provider; must **not** promote to **FULFILLED**. Reloadly classifiers include **pending** / **ambiguous** paths (source). Stalled verification TTLs in env names (`reloadlyTopupInFlightTtlSeconds`, etc.).

### FM-04 — Duplicate webhook

Stripe retries same `event.id`. Expected: shadow ack or P2002 → 200 without double side effects (`stripeWebhook.routes.js`, `moneyPathRedisRegistry.js`).

### FM-05 — Duplicate checkout

Same `Idempotency-Key` → reuse row (`paymentCheckoutService.js`, `idempotencyService.js`). Different key → new session (by design).

### FM-06 — Duplicate provider execution

Second POST without new attempt id / registry collision. Mitigation: `zwr_{FulfillmentAttempt.id}` custom identifier (source comment in `reloadlyClient.js`). **NOT VERIFIED** under race.

### FM-07 — Stale pending order

**PENDING** or **PROCESSING** beyond SLA. `processingRecoveryService` / workers (source) — behavior **NOT VERIFIED**.

### FM-08 — Missing provider reference

**FULFILLED** without `transactionId` or persisted reference in attempt summary. **Invariant violation** if policy requires reference.

### FM-09 — Completed without provider proof

Terminal **FULFILLED** with mock fallback or mock airtime while `AIRTIME_PROVIDER=reloadly` — may be **valid in dev** only; **forbidden in production** without DR.

### FM-10 — User charged without service

Paid checkout, fulfillment never queued or outbound disabled (`shouldBlockPhase1ReloadlyOutbound`). **No-pay-no-service** violation.

### FM-11 — Delivered without confirmed provider success

UI or API implies delivery; provider state pending. WebTopup user-facing status helpers exist — **NOT VERIFIED**.

### FM-12 — Wallet / order / payment mismatch

Wallet ledger vs `PaymentCheckout` amount — `walletStrictLedgerVerify` env (optional). **NOT VERIFIED**.

### FM-13 — Audit log missing

Transition without `writeOrderAudit`. **Gap** if code path skips audit.

### FM-14 — Sandbox / live confusion

`RELOADLY_SANDBOX` vs production host — CORE-02 boundary. Wrong env → false confidence or real spend.

### FM-15 — Operator error

Admin retry / force-deliver with weak reason — `webtopIncidentRunbook.js` uses idempotency keys with timestamps — **approval-gated** in governance.

---

## 4. Invariant ↔ failure mapping

| Invariant | Failure modes |
|-----------|---------------|
| INV-01 | FM-04, FM-05, FM-06, FM-12 |
| INV-02 | FM-09, FM-11 |
| INV-03 | FM-10 |
| INV-04 | FM-06 |
| INV-05 | FM-13 |
| INV-06 | FM-03, FM-08 |
| INV-07 | FM-15 (+ ungoverned self-heal) |

---

## 5. Claim boundary

| Claim | Allowed? |
|-------|----------|
| Failure modes **cataloged** | **YES** |
| Failures **prevented in production** | **NO** |
| All gaps **closed** | **NO** |

---

*End of failure mode model.*
