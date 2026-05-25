# STR-08 Probe Results And Log Correlation

**Date:** 2026-05-25
**Status:** **PROBE EXECUTED ONCE / VERCEL MARKER CORRELATION NOT FOUND**

---

## Probe Result

| Field | Value |
|-------|-------|
| Probe executed | **YES** |
| Probe count | **EXACTLY ONE** |
| Timestamp UTC | `2026-05-25T21:07:23.278Z` |
| Endpoint | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Method | `POST` |
| Request type | Synthetic invalid-signature payload |
| HTTP status | `400` |
| Body summary | Empty response body |
| Retry | **NOT EXECUTED** |

---

## Vercel Log Marker Findings

| Marker | Finding |
|--------|---------|
| `ZW_STRIPE_WEBHOOK_OBSERVABILITY` | **CAPTURED AS NOT FOUND / NO LOGS FOUND** - `STR08-VERCEL-LOG-ZW-OBSERVABILITY-004.png` |
| `route_entry` | **CAPTURED AS NOT FOUND / NO LOGS FOUND** - `STR08-VERCEL-LOG-ROUTE-ENTRY-005.png` |
| `signature_verification_failed` | **CAPTURED AS NOT FOUND / NO LOGS FOUND** - `STR08-VERCEL-LOG-SIGNATURE-FAILED-006.png` |
| `response_sent` | **CAPTURED AS NOT FOUND / NO LOGS FOUND** - `STR08-VERCEL-LOG-RESPONSE-SENT-007.png` |
| Event ID appears | **NOT FOUND / INCONCLUSIVE** |

---

## Processing Proof Boundary

| Item | Status |
|------|--------|
| `checkout.session.expired` processing | **NOT PROVEN** |
| Stripe event/replay used | **NO** |
| Payment/order/wallet mutation proven | **NO** |
| Full webhook processing proof | **NOT PROVEN** |
| Vercel marker correlation | **NOT FOUND / INCONCLUSIVE** |
| Fix | **NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |

---

*Results doc updated after ingesting Vercel marker captures; marker correlation remains not found/inconclusive*
