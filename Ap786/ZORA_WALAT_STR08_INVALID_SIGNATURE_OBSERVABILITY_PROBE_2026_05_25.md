# STR-08 Invalid-Signature Observability Probe

**Date:** 2026-05-25
**Approval phrase:** `APPROVE STR-08 STAGING INVALID-SIGNATURE OBSERVABILITY PROBE ONLY`
**Status:** **PROBE EXECUTED ONCE / LOG CAPTURE PENDING**

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
| Vercel marker search | **PENDING OPERATOR CAPTURE** |
| Retry | **NOT EXECUTED** |
| Stripe event/replay | **NOT EXECUTED** |

---

## 5. Conservative Verdict

| Item | Status |
|------|--------|
| STR-08 invalid-signature probe | **EXECUTED ONCE** |
| Stripe resend/replay/test event | **NOT EXECUTED** |
| Payment processing proof | **NOT PROVEN** |
| Full webhook processing proof | **NOT PROVEN** |
| STR-06 observability runtime visibility | **PENDING OPERATOR LOG CAPTURE** |
| Fix | **NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-08 probe doc updated after the approved one-time POST*
