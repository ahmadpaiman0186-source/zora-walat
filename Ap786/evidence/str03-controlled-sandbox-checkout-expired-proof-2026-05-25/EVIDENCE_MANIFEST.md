# Evidence Manifest - STR-03 Controlled Sandbox checkout.session.expired Webhook Proof

**Date:** 2026-05-25
**Approval phrase:** `APPROVE STR-03 CONTROLLED SANDBOX CHECKOUT.EXPIRED WEBHOOK PROOF ONLY`

**Policy:** Evidence registration only until operator screenshots are provided. Sandbox/test mode only. No live mode, production endpoint, real money, deploy/redeploy, Vercel env/settings edit, Stripe live-mode action, manual DB/payment/wallet/order mutation, credential rotation, or self-healing apply.

---

## Required Captures

| Evidence ID | Filename | Purpose | Status |
|-------------|----------|---------|--------|
| STR03-001 | `STR03-STRIPE-SANDBOX-MODE-CONFIRMED-001.png` | Prove Stripe dashboard is in sandbox/test mode | **CAPTURED** |
| STR03-002 | `STR03-STAGING-WEBHOOK-ENDPOINT-CONFIRMED-002.png` | Prove target endpoint is `https://zora-walat-api-staging.vercel.app/webhooks/stripe` | **CAPTURED** |
| STR03-003 | `STR03-CHECKOUT-SESSION-EXPIRED-EVENT-SELECTED-003.png` | Prove event type `checkout.session.expired` trigger/selection | **SUCCEEDED / CAPTURED** |
| STR03-004 | `STR03-CHECKOUT-SESSION-EXPIRED-DELIVERY-RESULT-004.png` | Prove Stripe delivery result; success requires HTTP 2xx | **HTTP 200 OK CAPTURED** |
| STR03-005 | `STR03-VERCEL-RUNTIME-LOG-WEBHOOK-RECEIVED-005.png` | Prove Vercel received webhook request | **CAPTURED - NOT FOUND / INCONCLUSIVE** |
| STR03-006 | `STR03-VERCEL-RUNTIME-LOG-EVENT-ID-CORRELATION-006.png` | Prove Stripe event ID correlates with Vercel log | **CAPTURED - NOT FOUND / INCONCLUSIVE** |
| STR03-007 | `STR03-VERCEL-RUNTIME-LOG-IDEMPOTENCY-LIFECYCLE-007.png` | Prove idempotency/lifecycle logging occurred | **CAPTURED - NOT FOUND / INCONCLUSIVE** |
| STR03-008 | `STR03-VERCEL-RUNTIME-LOG-FAST-ACK-OBSERVED-008.png` | Prove fast ACK path/lifecycle was observed | **CAPTURED - NOT FOUND / INCONCLUSIVE** |

---

## Current Verdict

| Item | Status |
|------|--------|
| STR-03 approval | **APPROVED FOR SANDBOX ONLY** |
| STR-03 execution | **COMPLETED FOR CONTROLLED SANDBOX EVIDENCE CAPTURE** |
| Stripe sandbox/test mode proof | **CAPTURED** |
| Endpoint proof | **CAPTURED** |
| `checkout.session.expired` trigger/proof | **SUCCEEDED / CAPTURED** |
| Stripe delivery to staging endpoint | **HTTP 200 OK CAPTURED** |
| Stripe-side delivery proof | **PARTIAL PROOF CAPTURED** |
| Vercel visible runtime log `/webhooks/stripe` | **NOT FOUND / INCONCLUSIVE** |
| Vercel event ID correlation | **NOT FOUND / INCONCLUSIVE** |
| Vercel idempotency/lifecycle log | **NOT FOUND / INCONCLUSIVE** |
| Vercel fast ACK log | **NOT FOUND / INCONCLUSIVE** |
| Full processing proof | **NOT FULLY PROVEN** |
| Fix | **PARTIAL / NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

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

*Manifest - all eight STR-03 screenshots ingested; Vercel runtime correlation remains not found / inconclusive*
