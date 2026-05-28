# CORE-00 Core Product Priority Matrix

**Date:** 2026-05-28
**Status:** **PLANNING ONLY**

---

## Priority matrix

| Rank | Workstream | Business impact | Eng risk | Dependency risk | Exec order |
|------|------------|-----------------|----------|-----------------|------------|
| **1** | Checkout / webhook / no-pay-no-service proof | **Critical** — money path trust | High if wrong | Stripe + Vercel deploy | **First** |
| **2** | Provider catalog + availability verification | **High** — sell what works | Medium | Reloadly / provider API | **Second** |
| **3** | Mobile top-up flow hardening | **High** — core revenue | Medium | P1 + P2 | **Third** |
| **4** | Data package flow hardening | **High** — core revenue | Medium | P1 + P2 | **Fourth** |
| **5** | International call product boundary | **Medium** — scope clarity | Low–Med | Legal/product | **Fifth** |
| **6** | Receipt / support / user trust | **High** — retention | Medium | Order state accuracy | **Sixth** |
| **7** | Controlled pilot readiness | **Critical** — launch gate | High | All above | **Last** |

---

## Priority 1: Checkout / webhook / no-pay-no-service proof

Prove: paid checkout → webhook → terminal order state; unpaid → **no** fulfillment.

Evidence: staging logs, status-check harness, duplicate webhook tests (existing STR/L tracks).

**Status:** Partial historical evidence; post-STR-12 window **PENDING**.

---

## Priority 2: Provider catalog and availability

Verify: catalog matches provider; products available before sale; drift detection.

**Status:** Gap analysis in [readiness matrix](./ZORA_WALAT_CORE00_TOPUP_DATA_CALL_READINESS_GAP_MATRIX_2026_05_28.md).

---

## Priority 3–4: Top-up and data hardening

End-to-end flow: quote → pay → fulfill → receipt; fail-closed on provider errors.

---

## Priority 5: International call boundary

Product scope, pricing, fulfillment model — **boundary doc**; not full launch claim.

---

## Priority 6: Receipt / support / trust

User-visible order status, failure comms, support escalation path.

---

## Priority 7: Controlled pilot

All CORE0-G1…G4 evidence + stakeholder approval — default **NO-GO**.

---

## Recommended execution order

```text
1 → 2 → 3 ∥ 4 → 5 → 6 → 7
```

Parallel 3+4 only after 1–2 gates pass.

---

*CORE-00 priority matrix — sequencing only*
