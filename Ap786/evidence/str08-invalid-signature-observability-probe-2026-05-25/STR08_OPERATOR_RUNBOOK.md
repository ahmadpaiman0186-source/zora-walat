# STR-08 Operator Runbook

**Date:** 2026-05-25
**Status:** **EXECUTED ONCE / MARKER CAPTURES INGESTED / DO NOT REPEAT WITHOUT NEW APPROVAL**

---

## Approved Action

Run exactly one non-Stripe invalid-signature HTTP `POST` to:

```text
https://zora-walat-api-staging.vercel.app/webhooks/stripe
```

The request must include:

- Synthetic JSON body.
- Invalid `Stripe-Signature` header.
- `X-Zora-Walat-Probe: STR08_INVALID_SIGNATURE_OBSERVABILITY_PROBE_ONLY`.

---

## Forbidden Actions

| Action | Status |
|--------|--------|
| Second HTTP probe | **FORBIDDEN WITHOUT NEW APPROVAL** |
| Stripe resend/replay/test event | **FORBIDDEN** |
| Stripe CLI trigger | **FORBIDDEN** |
| Live mode | **FORBIDDEN** |
| Production endpoint | **FORBIDDEN** |
| Deploy/redeploy | **FORBIDDEN** |
| Vercel settings/env/domain edit | **FORBIDDEN** |
| DB/payment/wallet/order mutation | **FORBIDDEN** |
| Credential rotation | **FORBIDDEN** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## Post-Probe Capture

After the single POST, document:

- Exact timestamp.
- Endpoint and method.
- Status code and sanitized body summary.
- Whether Vercel logs show `ZW_STRIPE_WEBHOOK_OBSERVABILITY`.
- Whether Vercel logs show `route_entry`.
- Whether Vercel logs show `signature_verification_failed`.
- Whether Vercel logs show `response_sent`.
- Whether no Stripe resend/replay/test event was used.

---

## Executed Probe Result

| Field | Value |
|-------|-------|
| Timestamp UTC | `2026-05-25T21:07:23.278Z` |
| Endpoint | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Method | `POST` |
| HTTP status | `400` |
| Body summary | Empty response body |
| Probe count | Exactly one |
| Retry | Not executed |
| Stripe resend/replay/test event | Not executed |
| Vercel marker captures | Ingested; no logs found for all four required filters |

Operator Vercel log captures were supplied and ingested for the four required marker searches. Each screenshot shows no logs found for the selected filter.

---

## Conservative Interpretation

Controlled rejection was captured by HTTP status, but the ingested Vercel screenshots did not show the expected markers. STR-08 therefore remains **NOT FOUND / INCONCLUSIVE** for runtime marker correlation and does not prove Stripe payment processing, full webhook processing, or production readiness.

---

*Runbook - one approved invalid-signature POST executed; no retry authorized*
