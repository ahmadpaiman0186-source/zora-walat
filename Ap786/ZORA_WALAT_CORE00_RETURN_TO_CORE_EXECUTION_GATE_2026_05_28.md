# CORE-00 Return To Core Execution Gate

**Date:** 2026-05-28
**Pack ID:** CORE-00
**Status:** **EXECUTION GATE FILED ONLY / NOT EXECUTED**
**Parking directive:** [AFG-CARD-02 return to core](./ZORA_WALAT_AFG_CARD02_RETURN_TO_CORE_HANDOFF_2026_05_28.md)

---

## 1. Purpose

CORE-00 defines the **re-entry execution gate** for core Zora-Walat after XCH, CARD, and AFG-CARD strategic tracks are parked — prioritizing mobile top-up, data packages, international call boundary, provider reliability, checkout/webhook safety, and fail-closed order behavior **without** implementing runtime changes in this pack.

---

## 2. Why XCH / CARD / AFG-CARD are parked

| Track | Status | Reason |
|-------|--------|--------|
| **XCH-00…XCH-06** | Spec complete; **not implemented** | Exchange/remittance architecture + sim boundary only |
| **CARD-00** | Architecture filed | Cross-border card — no partners |
| **AFG-CARD-00…01** | Architecture + DD filed | Domestic wallet — no approvals |
| **AFG-CARD-02** | **PARKED / ACTIVATION REQUIRED** | Explicit freeze until E-01…E-10 |

See [parked tracks boundary](./ZORA_WALAT_CORE00_PARKED_TRACKS_BOUNDARY_2026_05_28.md).

---

## 3. Core product re-entry directive

**Engineering focus returns to the existing Zora-Walat product** — telecom services (top-up, data, call boundary), Stripe checkout path, webhook/order safety, and user trust — **not** wallet/card/bank/remittance rails.

CORE-00 authorizes **planning and gated execution sequencing only** — not runtime work without separate approval.

---

## 4. Core priorities

| Priority | Area | Gate doc |
|----------|------|----------|
| **P0** | Checkout / webhook / no-pay-no-service | [Payment gate](./ZORA_WALAT_CORE00_PAYMENT_WEBHOOK_ORDER_SAFETY_GATE_2026_05_28.md) |
| **P1** | Provider reliability / fail-closed | [Provider gate](./ZORA_WALAT_CORE00_PROVIDER_RELIABILITY_AND_FAIL_CLOSED_GATE_2026_05_28.md) |
| **P1** | Mobile top-up hardening | [Gap matrix](./ZORA_WALAT_CORE00_TOPUP_DATA_CALL_READINESS_GAP_MATRIX_2026_05_28.md) |
| **P1** | Data package hardening | [Gap matrix](./ZORA_WALAT_CORE00_TOPUP_DATA_CALL_READINESS_GAP_MATRIX_2026_05_28.md) |
| **P2** | International call **boundary** | [Gap matrix](./ZORA_WALAT_CORE00_TOPUP_DATA_CALL_READINESS_GAP_MATRIX_2026_05_28.md) |
| **P2** | Receipt / support / user trust | [Trust gate](./ZORA_WALAT_CORE00_RECEIPT_SUPPORT_AND_USER_TRUST_GATE_2026_05_28.md) |
| **P3** | Controlled pilot preconditions | [Pilot preconditions](./ZORA_WALAT_CORE00_CONTROLLED_PILOT_PRECONDITIONS_2026_05_28.md) |

Full matrix: [priority matrix](./ZORA_WALAT_CORE00_CORE_PRODUCT_PRIORITY_MATRIX_2026_05_28.md).

---

## 5. Invariant reminders

| Invariant | Rule |
|-----------|------|
| **No-pay-no-service** | Unpaid checkout → no fulfillment |
| **Fail-closed orders** | Ambiguity → hold; no silent success |
| **No duplicate fulfillment** | Idempotent webhook + order state |
| **Provider fail-closed** | Unavailable → reject; no blind retry money path |

---

## 6. Approval gates (CORE-00 layer)

| Gate | Default |
|------|---------|
| **CORE0-G0** | Execution gate pack filed — **COMPLETE (DOCS ONLY)** |
| **CORE0-G1** | Checkout/webhook evidence complete | **BLOCKED** |
| **CORE0-G2** | Provider reliability evidence | **BLOCKED** |
| **CORE0-G3** | Top-up/data gap closure plan approved | **BLOCKED** |
| **CORE0-G4** | Controlled pilot preconditions | **BLOCKED** |

---

## 7. Controlled pilot NO-GO default

| Item | Default |
|------|---------|
| Core product pilot | **NO-GO** |
| Real-money-ready / production-ready | **NOT CLAIMED** |
| Top-up-ready / webhook-ready / fix-proven | **NOT CLAIMED** |

---

*CORE-00 execution gate — planning only; not executed*
