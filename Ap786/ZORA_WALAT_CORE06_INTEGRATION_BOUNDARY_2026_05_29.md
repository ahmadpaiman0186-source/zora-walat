# CORE-06 Integration Boundary

**Date:** 2026-05-29

---

## v1: NOT WIRED

`noPayNoServiceProof` is **not imported** by checkout, webhooks, Reloadly client, or order lifecycle. Live behavior unchanged.

---

## Future hooks (approval required)

| Surface | Function | Gate |
|---------|----------|------|
| Checkout success confirmation | `evaluateNoPayNoServiceDelivery` | Before UX “delivered” copy |
| Stripe webhook processing | proof bundle from event + order | Before `FULFILLED` transition |
| Order state transition | same | Before status write |
| Provider fulfillment attempt | provider section of bundle | Before POST (with CORE-05) |
| Service delivery marker | order.serviceDeliveredFlag | **Never set true** unless ALLOW |
| Wallet mutation | payment proof required | Before credit |
| Refund/reversal review | FAIL_CLOSED / PENDING_REVIEW | Ops workflow |

---

## CORE-04 doctor (optional export)

`deliveryDecisionToDoctorFinding()` maps CORE-06 decisions to doctor-shaped findings for future CORE-07/08. **Not** registered in `runtimeDoctor` scanners in v1.

---

## CORE-05 relationship

Idempotency risk in proof bundle should be populated from CORE-05 `classifyIdempotencyAttempt` in future wiring. v1: fixture flags only.

---

*End of boundary.*
