# Evidence Manifest - STR-03 Controlled Sandbox checkout.session.expired Webhook Proof

**Date:** 2026-05-25
**Approval phrase:** `APPROVE STR-03 CONTROLLED SANDBOX CHECKOUT.EXPIRED WEBHOOK PROOF ONLY`

**Policy:** Evidence registration only until operator screenshots are provided. Sandbox/test mode only. No live mode, production endpoint, real money, deploy/redeploy, Vercel env/settings edit, Stripe live-mode action, manual DB/payment/wallet/order mutation, credential rotation, or self-healing apply.

---

## Required Captures

| Evidence ID | Filename | Purpose | Status |
|-------------|----------|---------|--------|
| STR03-001 | `STR03-STRIPE-SANDBOX-MODE-CONFIRMED-001.png` | Prove Stripe dashboard is in sandbox/test mode | **PENDING CAPTURE** |
| STR03-002 | `STR03-STAGING-WEBHOOK-ENDPOINT-CONFIRMED-002.png` | Prove target endpoint is `https://zora-walat-api-staging.vercel.app/webhooks/stripe` | **PENDING CAPTURE** |
| STR03-003 | `STR03-CHECKOUT-SESSION-EXPIRED-EVENT-SELECTED-003.png` | Prove event type `checkout.session.expired` is selected | **PENDING CAPTURE** |
| STR03-004 | `STR03-CHECKOUT-SESSION-EXPIRED-DELIVERY-RESULT-004.png` | Prove Stripe delivery result; success requires HTTP 2xx | **PENDING CAPTURE** |
| STR03-005 | `STR03-VERCEL-RUNTIME-LOG-WEBHOOK-RECEIVED-005.png` | Prove Vercel received webhook request | **PENDING CAPTURE** |
| STR03-006 | `STR03-VERCEL-RUNTIME-LOG-EVENT-ID-CORRELATION-006.png` | Prove Stripe event ID correlates with Vercel log | **PENDING CAPTURE** |
| STR03-007 | `STR03-VERCEL-RUNTIME-LOG-IDEMPOTENCY-LIFECYCLE-007.png` | Prove idempotency/lifecycle logging occurred | **PENDING CAPTURE** |
| STR03-008 | `STR03-VERCEL-RUNTIME-LOG-FAST-ACK-OBSERVED-008.png` | Prove fast ACK path/lifecycle was observed | **PENDING CAPTURE** |

---

## Current Verdict

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

## Safety Attestation

| Action | Result |
|--------|--------|
| Live mode | **NO** |
| Production endpoint | **NO** |
| Real money | **NO** |
| Deploy / redeploy | **NO** |
| Vercel env/settings edit | **NO** |
| Manual DB/payment/wallet/order mutation | **NO** |
| Credential rotation | **NO** |
| Self-healing apply | **NO** |

---

*Manifest - all STR-03 screenshots pending capture*
