# CORE-03 No-Pay-No-Service Control Model

**Date:** 2026-05-29  
**Extends:** [CORE-02 no-pay-no-service rules](./ZORA_WALAT_CORE02_NO_PAY_NO_SERVICE_PROVIDER_FAILURE_RULES_2026_05_29.md)  
**Status:** **KERNEL CONTROL MODEL — runtime NOT VERIFIED**

---

## 1. Principle (kernel law)

| # | Law |
|---|-----|
| 1 | **No delivery without provider success proof** (corridor-specific). |
| 2 | **No settled charge without a reconcilable service path** (checkout → paid → fulfillment attempt). |
| 3 | **Ambiguous provider outcome → pending**, never **FULFILLED**. |

---

## 2. State-gated enforcement (source-aligned)

| State | User-visible claim allowed | Provider |
|-------|---------------------------|----------|
| PENDING | “Awaiting payment” | None |
| PAID | “Payment received — processing” | Not yet confirmed |
| PROCESSING | “Processing top-up” | In flight / unknown |
| FULFILLED | “Delivered” (if proof ok) | **Confirmed** per policy |
| FAILED | “Failed — support” | Failed / abandoned |
| CANCELLED | “Cancelled” | None |

Source: `orderLifecycle.js` edges; adapter outcome mapping in `deliveryAdapter.js` / Reloadly classifiers.

---

## 3. Control points

| Checkpoint | Expected behavior | Source |
|------------|-------------------|--------|
| Pre-checkout | Reject invalid SKU / disabled data | `catalogResolver`, `allowedCheckout` |
| Post-Stripe paid | Schedule fulfillment; not FULFILLED | webhook handlers |
| Pre-provider POST | Outbound policy gate | `shouldBlockPhase1ReloadlyOutbound` |
| Post-provider response | Map SUCCESSFUL+txnId vs ambiguous | Reloadly normalize/classify |
| Mock fallback | Must not mask prod failure | `providerFallbackPolicy` env |
| WebTopup | Separate paid → fulfill schedule | webtopup webhook handlers |

---

## 4. Violation scenarios

| Scenario | INV | FM |
|----------|-----|-----|
| Stripe paid, outbound disabled, user sees success | INV-03 | FM-10 |
| Reloadly timeout → FULFILLED | INV-06 | FM-03, FM-11 |
| Mock fulfill while Reloadly selected in prod | INV-02 | FM-09 |
| Data SKU sold without resolver | INV-02 | CORE-01 DP gaps |

---

## 5. Runtime vs documentation

| Item | In CORE-02 docs | In runtime (source suggests) | Verified? |
|------|-----------------|------------------------------|-----------|
| Policy text | **YES** | Partial gates | **NOT VERIFIED** |
| Data corridor block | **YES** | `catalogResolver` null | **YES (code)** |
| Airtime Reloadly proof | Planned | Attempt + classifiers | **NOT VERIFIED** |
| Refund when paid-not-delivered | Planned | Incident runbook paths | **NOT VERIFIED** |

**No-pay-no-service runtime enforcement: NOT VERIFIED.**

---

## 6. Safe system responses (matrix link)

| Provider outcome | Order status | User message class |
|------------------|--------------|-------------------|
| Terminal fail | FAILED | Fail + support |
| Retryable | PROCESSING / PAID | Processing |
| Ambiguous | PROCESSING (hold) | Pending verification |
| Confirmed | FULFILLED | Success |

---

## 7. Self-repair boundary

Paid-not-delivered repair is **Class C** only — never auto-refund or auto-fulfill without approval ([self-repair model](./ZORA_WALAT_CORE03_SELF_REPAIR_CLASSIFICATION_MODEL_2026_05_29.md)).

---

## 8. NO-GO

| Claim | Status |
|-------|--------|
| No-pay-no-service **enforced in production** | **NOT CLAIMED** |
| Kernel model **FILED** | **YES** |

---

*End of no-pay-no-service control model.*
