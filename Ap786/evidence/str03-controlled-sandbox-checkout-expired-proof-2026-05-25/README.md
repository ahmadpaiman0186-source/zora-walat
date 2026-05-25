# STR-03 Controlled Sandbox checkout.session.expired Webhook Proof

**Date:** 2026-05-25
**Approval phrase:** `APPROVE STR-03 CONTROLLED SANDBOX CHECKOUT.EXPIRED WEBHOOK PROOF ONLY`
**Status:** **PENDING OPERATOR ACTION**

**Scope:** Sandbox/test-mode only, target endpoint only:

```text
https://zora-walat-api-staging.vercel.app/webhooks/stripe
```

No live mode, production endpoint, real money, deploy/redeploy, Vercel env/settings edit, Stripe live-mode action, DB/payment/wallet/order mutation, credential rotation, or self-healing apply is authorized.

---

## Current Status

| Item | Status |
|------|--------|
| STR-03 approval | **APPROVED FOR SANDBOX ONLY** |
| STR-03 execution | **PENDING OPERATOR ACTION** |
| Stripe sandbox/test mode proof | **PENDING CAPTURE** |
| Endpoint proof | **PENDING CAPTURE** |
| `checkout.session.expired` selected/proof | **PENDING CAPTURE** |
| Stripe delivery HTTP result | **PENDING CAPTURE** |
| Vercel runtime log correlation | **PENDING CAPTURE** |
| HTTP 2xx Stripe processing | **NOT ACHIEVED YET** |
| Stripe event processing | **NOT PROVEN YET** |
| Fix | **NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |

---

## Required Captures

See [EVIDENCE_MANIFEST.md](./EVIDENCE_MANIFEST.md) for all eight required screenshots.

---

## Claim Boundary

STR-03 may only be marked **PASSED** after sandbox mode, correct endpoint, `checkout.session.expired`, HTTP 2xx delivery, matching Vercel receipt, matching event ID, and lifecycle/idempotency/fast ACK evidence are all captured.

Until then: HTTP 2xx Stripe processing is **NOT ACHIEVED YET**, event processing is **NOT PROVEN YET**, and fix is **NOT FULLY PROVEN**.

---

*STR-03 scaffold - pending operator screenshots - no execution recorded*
