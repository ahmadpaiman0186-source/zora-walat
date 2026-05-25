# STR-02 Post-Fix Sandbox HTTP Proof

**Date:** 2026-05-24
**Approval phrase received:** `APPROVE STR-02 POST-FIX SANDBOX WEBHOOK HTTP PROOF ONLY`
**Evidence folder:** [str02-postfix-sandbox-http-proof-2026-05-24](./evidence/str02-postfix-sandbox-http-proof-2026-05-24/README.md)

**Policy:** Sandbox/test-mode HTTP proof only. No Stripe resend/test event, no live mode, no deploy/redeploy, no Vercel settings edit, no env edit, no DB/payment/wallet/order mutation, no self-healing apply, no production-ready claim.

---

## 1. Baseline

| Item | Status |
|------|--------|
| PR #72 routing fix | **MERGED** |
| PR #74 route intelligence guard | **MERGED** |
| PR #75 route-surface evidence | **MERGED** |
| `/api/webhooks/stripe` visible in Resources | **CAPTURED** |
| Domain mapping valid / production | **CAPTURED** |
| Prior `/webhooks/stripe` logs | **NO LOGS FOUND** |
| Prior `stripe` logs | **NO LOGS FOUND** |
| HTTP 200 before this proof | **NOT ACHIEVED** |
| Fix before this proof | **NOT YET PROVEN** |

---

## 2. Proof Method

The approved safe proof was a single invalid-signature HTTP POST to the deployed webhook path:

```text
POST https://zora-walat-api-staging.vercel.app/webhooks/stripe
Stripe-Signature: intentionally invalid placeholder
```

This is non-mutating because `server/api/slimStripeWebhookHandler.mjs` constructs the Stripe event before any money-path processor is invoked. Invalid signature returns fail-closed before event processing.

---

## 3. Observed HTTP Result

| Field | Observation |
|-------|-------------|
| HTTP status | **400** |
| Response content type | `application/json; charset=utf-8` |
| Cache-Control | `no-store` |
| Server | `Vercel` |
| Response body | Empty body observed by local client |
| Vercel runtime log correlation | **NOT CAPTURED** in this run |
| Stripe event processed | **NO** |
| DB/payment/wallet/order mutation | **NO** |

---

## 4. Interpretation

The `400` response is useful evidence that the deployed `/webhooks/stripe` route is reachable and fails closed at the signature boundary. It does **not** prove successful Stripe event processing, because no valid signed Stripe event was sent.

---

## 5. Conservative Verdict

| Item | Status |
|------|--------|
| Route reachability | **PROVEN PARTIAL** |
| Stripe event processing | **NOT PROVEN** |
| HTTP 2xx Stripe processing | **NOT ACHIEVED** |
| Fix | **NOT FULLY PROVEN** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Production-ready | **NO** |
| Real-money-ready | **NO** |
| Controlled-pilot-ready | **NO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 6. Next Approval Required

To prove successful Stripe event processing, a separate approval is still required:

```text
APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY
```

No resend or Stripe test event was executed by this proof.

---

*Post-fix HTTP proof - route reachability partial - no Stripe processing proof*
