# STR-02 Post-Fix Sandbox HTTP Proof Evidence

**Date:** 2026-05-24
**Approval phrase received:** `APPROVE STR-02 POST-FIX SANDBOX WEBHOOK HTTP PROOF ONLY`
**Mode:** Sandbox/test-mode route reachability proof only.

**Policy:** No Stripe resend, no Stripe test event, no live mode, no deploy/redeploy, no Vercel settings edit, no env edit, no DB/payment/wallet/order mutation, no self-healing apply.

---

## Proof Method

| Field | Value |
|-------|-------|
| Method | Single POST with intentionally invalid `Stripe-Signature` |
| URL/path tested | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Request body | Non-Stripe JSON marker only |
| Expected behavior | Fail closed before Stripe event construction succeeds |
| Mutation risk | **NONE EXPECTED** - invalid signature stops before event processing |

---

## Observed Result

| Item | Result |
|------|--------|
| HTTP status | **400** |
| Response content type | `application/json; charset=utf-8` |
| Cache-Control | `no-store` |
| Server header | `Vercel` |
| Response body | Empty body observed by local client |
| Stripe event processed | **NO** |
| DB/payment/wallet/order mutation | **NO** |
| Vercel runtime log correlation | **NOT CAPTURED** in this run |

---

## Interpretation

The invalid-signature `400` response proves that the deployed `/webhooks/stripe` route is reachable and fails closed at the webhook boundary. It does **not** prove successful Stripe event processing because no valid signed Stripe event was sent.

---

## Conservative Verdict

| Item | Status |
|------|--------|
| Route reachability | **PROVEN PARTIAL** |
| Stripe event processing | **NOT PROVEN** |
| HTTP 2xx Stripe processing | **NOT ACHIEVED** |
| Fix | **NOT FULLY PROVEN** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Invalid-signature HTTP proof only - no Stripe event processing proof*
