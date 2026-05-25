# STR-08 Invalid-Signature Observability Probe

**Date:** 2026-05-25
**Approval phrase:** `APPROVE STR-08 STAGING INVALID-SIGNATURE OBSERVABILITY PROBE ONLY`
**Status:** **PROBE EXECUTED ONCE / VERCEL MARKER CORRELATION NOT FOUND**

---

## 1. Purpose

STR-08 tests whether STR-06 runtime observability markers can appear for a controlled invalid-signature webhook request on staging.

This is not a Stripe event replay. It is not a Stripe CLI trigger. It is not payment processing proof.

---

## 2. Approved Endpoint

| Field | Value |
|-------|-------|
| Method | `POST` |
| Endpoint | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Payload | Synthetic JSON only |
| Signature | Intentionally invalid |
| Probe count | Exactly one |

---

## 3. Expected Safe Outcome

The expected safe outcome is controlled rejection/signature failure, likely HTTP `400` or another non-2xx rejection.

This must not be interpreted as:

- Payment processing proof.
- Stripe event processing proof.
- Full webhook processing proof.
- DB/payment/wallet/order mutation proof.
- Production readiness.

---

## 4. Result Placeholder

| Item | Status |
|------|--------|
| Probe timestamp | `2026-05-25T21:07:23.278Z` |
| HTTP status | `400` |
| Body summary | Empty response body |
| Vercel marker search | **CAPTURED AS NOT FOUND / NO LOGS FOUND** |
| Retry | **NOT EXECUTED** |
| Stripe event/replay | **NOT EXECUTED** |

---

## 5. Vercel Marker Capture Result

| Marker | Screenshot | Result |
|--------|------------|--------|
| `ZW_STRIPE_WEBHOOK_OBSERVABILITY` | `STR08-VERCEL-LOG-ZW-OBSERVABILITY-004.png` | **NOT FOUND / NO LOGS FOUND** |
| `route_entry` | `STR08-VERCEL-LOG-ROUTE-ENTRY-005.png` | **NOT FOUND / NO LOGS FOUND** |
| `signature_verification_failed` | `STR08-VERCEL-LOG-SIGNATURE-FAILED-006.png` | **NOT FOUND / NO LOGS FOUND** |
| `response_sent` | `STR08-VERCEL-LOG-RESPONSE-SENT-007.png` | **NOT FOUND / NO LOGS FOUND** |

---

## 6. Conservative Verdict

| Item | Status |
|------|--------|
| STR-08 invalid-signature probe | **EXECUTED ONCE** |
| Stripe resend/replay/test event | **NOT EXECUTED** |
| Payment processing proof | **NOT PROVEN** |
| Full webhook processing proof | **NOT PROVEN** |
| STR-06 observability runtime visibility | **NOT FOUND / INCONCLUSIVE** |
| Fix | **NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-08 probe doc updated after ingesting Vercel no-log marker captures*
