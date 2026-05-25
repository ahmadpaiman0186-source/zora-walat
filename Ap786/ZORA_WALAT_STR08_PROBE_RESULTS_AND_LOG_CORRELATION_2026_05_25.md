# STR-08 Probe Results And Log Correlation

**Date:** 2026-05-25
**Status:** **PROBE EXECUTED ONCE / LOG CAPTURE PENDING**

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
| `ZW_STRIPE_WEBHOOK_OBSERVABILITY` | **PENDING OPERATOR CAPTURE** |
| `route_entry` | **PENDING OPERATOR CAPTURE** |
| `signature_verification_failed` | **PENDING OPERATOR CAPTURE** |
| `response_sent` | **PENDING OPERATOR CAPTURE** |
| Event ID appears | **PENDING OPERATOR CAPTURE** |

---

## Processing Proof Boundary

| Item | Status |
|------|--------|
| `checkout.session.expired` processing | **NOT PROVEN** |
| Stripe event/replay used | **NO** |
| Payment/order/wallet mutation proven | **NO** |
| Full webhook processing proof | **NOT PROVEN** |
| Fix | **NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |

---

*Results doc updated after the one approved probe; Vercel marker evidence remains pending*
