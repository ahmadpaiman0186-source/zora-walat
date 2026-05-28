# CORE-00 Top-Up / Data / Call Readiness Gap Matrix

**Date:** 2026-05-28
**Status:** **GAP ANALYSIS ONLY / EVIDENCE PENDING**

---

## Gap table

| Area | Gap | Severity | Evidence status |
|------|-----|----------|-----------------|
| **Mobile top-up** | End-to-end staging proof post-STR-12 | **High** | **PENDING** |
| **Mobile top-up** | Provider failure UX | Medium | **PENDING** |
| **Data packages** | Catalog sync proof | **High** | **PENDING** |
| **Data packages** | Fulfillment confirmation | **High** | **PENDING** |
| **International call** | Product boundary doc vs code | Medium | **PARTIAL** |
| **International call** | Fulfillment model proof | Medium | **PENDING** |
| **Provider catalog** | Drift detection | **High** | **NOT IMPLEMENTED** |
| **Provider availability** | Pre-checkout validation | **High** | **GAP** |
| **Pricing / fees** | Disclosure vs charged amount | Medium | **REVIEW PENDING** |
| **Checkout** | Unpaid / expired / declined paths | **High** | Partial L-8/L-9/L-10 |
| **Webhook / order state** | Post-STR-12 correlation | **Critical** | **INCONCLUSIVE** |
| **Receipt** | User-facing confirmation | Medium | **PENDING** |
| **Support** | Runbook + escalation | Medium | **NOT FILED** |
| **Evidence** | CORE0-EV-* capture set | **Critical** | **NONE FILED** |

---

## Mobile top-up readiness

| Requirement | Met? |
|-------------|------|
| Pay only after checkout success | Partial |
| Fulfill only after PAID | Partial |
| Provider error → user message | **GAP** |
| Idempotent fulfillment | Partial |

---

## Data package readiness

Same pattern as top-up; catalog SKU mapping **review required**.

---

## International call readiness

**Boundary** definition priority over feature expansion — no call-ready claim.

---

*CORE-00 gap matrix — open gaps; not proven*
