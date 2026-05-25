# STR-05 Minimal Observability Fix Plan

**Date:** 2026-05-25
**Status:** **GATED IMPLEMENTATION CANDIDATE ONLY - NOT APPROVED**

---

## 1. Purpose

Define a minimal future observability implementation candidate that could make Stripe webhook runtime correlation easier to prove in staging, without changing payment/order/wallet behavior.

This plan is **not** authorization to edit code.

---

## 2. Candidate Change Set

| Candidate | Description | Intended Evidence Improvement |
|-----------|-------------|-------------------------------|
| OBS-01 | Add route-entry log with request path and method at the root bridge/serverless entry before signature processing | Proves the request hit the expected route surface |
| OBS-02 | Add Stripe event ID/type log after signature verification | Allows correlation using a redacted event suffix and event type |
| OBS-03 | Add idempotency decision log | Shows shadow ACK, DB unique insert, duplicate block, or new event path |
| OBS-04 | Add fast ACK / final response log | Shows ACK path and status before response end |
| OBS-05 | Add explicit `checkout.session.expired` lifecycle log | Makes expired-session branch visible without relying only on generic processor logs |
| OBS-06 | Document log search terms | Require suffix search, event type search, route search, and ACK path search |

---

## 3. Safety Requirements

| Requirement | Rule |
|-------------|------|
| No-pay-no-service | Must preserve existing pending-only cancellation and never downgrade paid/processing orders |
| Duplicate safety | Must preserve Stripe event idempotency row and Redis shadow ACK behavior |
| Payment/order/wallet behavior | Must not change without separate explicit approval |
| Secrets | Must not log secrets, raw payloads, full webhook signatures, full env values, or customer PII |
| Event IDs | Prefer redacted suffix or explicitly approved redacted correlation format |
| Runtime | Must be validated in staging before any production claim |
| Production claim | Not allowed from logging changes alone |

---

## 4. Future Validation Plan

| Validation | Required Before Claim |
|------------|-----------------------|
| Unit tests | Verify new log helper redacts secrets and emits expected fields |
| Static route verifier | Continue passing STR-02 route bridge verification |
| Staging sandbox proof | Single approved sandbox proof must capture route-entry, signature verified, event type, event ID suffix, idempotency decision, and final ACK |
| Vercel log evidence | Correct project/deployment/time/filter screenshots must show matching records |
| Regression boundary | No app behavior or money-path state changes except existing webhook processing |

---

## 5. Forbidden Without Separate Approval

| Action | Status |
|--------|--------|
| Changing webhook state transitions | **FORBIDDEN** |
| Changing payment/order/wallet mutation behavior | **FORBIDDEN** |
| Deploy/redeploy | **FORBIDDEN** |
| Stripe resend/replay/test event | **FORBIDDEN** |
| Env/config/secret changes | **FORBIDDEN** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 6. Current Conservative Verdict

This plan is a candidate only. Stripe-side delivery proof is **HTTP 200 OK CAPTURED**, but Vercel runtime correlation remains **NOT FOUND / INCONCLUSIVE**. Full processing proof remains **NOT FULLY PROVEN**, and fix remains **PARTIAL / NOT FULLY PROVEN**.

---

*Minimal observability plan - implementation requires separate explicit approval*
