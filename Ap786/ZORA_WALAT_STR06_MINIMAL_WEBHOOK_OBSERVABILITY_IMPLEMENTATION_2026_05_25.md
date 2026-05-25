# STR-06 Minimal Webhook Observability Implementation

**Date:** 2026-05-25
**Approval phrase:** `APPROVE STR-06 MINIMAL OBSERVABILITY IMPLEMENTATION ONLY`
**Status:** **LOCAL MINIMAL OBSERVABILITY IMPLEMENTED**

---

## 1. Purpose

STR-06 adds the smallest local observability improvement needed for a future sandbox webhook proof to correlate Stripe delivery with Vercel runtime logs.

This implementation does **not** deploy, resend, replay, trigger Stripe events, call Vercel APIs, mutate DB/payment/wallet/order state, rotate credentials, or enable self-healing apply.

---

## 2. Implementation Summary

| Area | Change |
|------|--------|
| Stable search prefix | Added `ZW_STRIPE_WEBHOOK_OBSERVABILITY` runtime breadcrumbs |
| Route entry | Logs `route_entry` with method, path, and timestamp |
| Signature success | Logs `signature_verified` with Stripe event ID and event type after verified constructEvent |
| Signature failure | Logs `signature_verification_failed` without raw body, signature header, secret, or PII |
| Idempotency/lifecycle result | Logs `idempotency_decision` where the slim path result is already available |
| `checkout.session.expired` | Logs `checkout_session_expired_received` for the slim expired path |
| Response/ACK | Logs `response_sent` with event ID/type when known, status code, result/reason, and duration |

---

## 3. Files Changed

| File | Purpose |
|------|---------|
| `server/api/stripeWebhookObservability.mjs` | New allowlisted console breadcrumb helper |
| `server/api/slimStripeWebhookHandler.mjs` | Minimal log calls at existing route/signature/lifecycle/ACK points |
| `server/test/stripeWebhookObservability.test.js` | Focused tests for redaction and emitted STR-06 markers |

---

## 4. Safety Boundary

| Boundary | Result |
|----------|--------|
| Webhook processing behavior changed | **NO** |
| Payment/order/wallet state behavior changed | **NO** |
| DB writes added purely for logging | **NO** |
| Raw request body logged | **NO** |
| Stripe signature header logged | **NO** |
| Secrets/env values logged | **NO** |
| Customer PII/card/bank details logged | **NO** |
| Deploy/redeploy | **NOT EXECUTED** |
| Stripe resend/replay/test event | **NOT EXECUTED** |
| Vercel API/settings/env/domain action | **NOT EXECUTED** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 5. Future Evidence Required

STR-06 only improves local observability source behavior. A future staging proof still must capture:

- Correct Vercel project and deployment.
- Correct time window around approved sandbox delivery.
- Vercel runtime logs containing `ZW_STRIPE_WEBHOOK_OBSERVABILITY`.
- Matching `route_entry`, `signature_verified`, event ID/type, `checkout_session_expired_received`, `idempotency_decision`, and `response_sent`.
- No deploy/redeploy/settings/env edits during capture.

---

## 6. Conservative Verdict

| Item | Status |
|------|--------|
| STR-06 implementation | **LOCAL MINIMAL OBSERVABILITY IMPLEMENTED** |
| Deploy / redeploy | **NOT EXECUTED** |
| Stripe resend / replay / test event | **NOT EXECUTED** |
| Vercel runtime proof after STR-06 | **NOT CAPTURED YET** |
| Full processing proof | **NOT FULLY PROVEN** |
| Fix | **NOT FULLY PROVEN UNTIL STAGING RUNTIME EVIDENCE IS CAPTURED** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-06 local implementation only - future staging evidence required before any stronger claim*
