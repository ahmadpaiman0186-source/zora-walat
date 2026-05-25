# Evidence Manifest - STR-02 Sandbox checkout.expired Resend Proof

**Date:** 2026-05-24
**Approval phrase received:** `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY`
**Execution status:** **NOT EXECUTED**

**Policy:** Exactly one Stripe sandbox/test-mode `checkout.expired` resend only after operator checklist confirmation. No live mode, no broad replay, no arbitrary test event, no new payment, no deploy/redeploy, no env/settings edit, no credential rotation, no manual DB/payment/wallet/order mutation, no self-healing apply.

---

## 1. Required Evidence Items

| Evidence ID | Artifact | Current Status | Notes |
|-------------|----------|----------------|-------|
| STR02-RS-00 | Preflight clean branch + verifier + secrets scan | **CAPTURED IN CHAT / PASS** | `npm run verify:str02-route`, `npm --prefix server run secrets:scan` passed |
| STR02-RS-01 | Operator checklist completed | **NOT CONFIRMED** | Must be complete before resend |
| STR02-RS-02 | Stripe Dashboard TEST/sandbox mode | **NOT CONFIRMED** | STOP if live mode |
| STR02-RS-03 | Existing event type `checkout.expired` | **NOT CONFIRMED** | STOP if any other event type |
| STR02-RS-04 | Endpoint URL matches approved URL | **NOT CONFIRMED** | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| STR02-RS-05 | Exactly one resend clicked | **NO / NOT EXECUTED** | Approval not consumed in this session |
| STR02-RS-06 | Stripe delivery HTTP status | **NOT CAPTURED** | Requires actual resend evidence |
| STR02-RS-07 | Stripe response summary | **NOT CAPTURED** | Requires actual resend evidence |
| STR02-RS-08 | Vercel `/webhooks/stripe` logs | **NOT CAPTURED** | Requires post-resend log review |
| STR02-RS-09 | Vercel `stripe` logs | **NOT CAPTURED** | Requires post-resend log review |
| STR02-RS-10 | Vercel `checkout.expired` logs | **NOT CAPTURED** | Requires post-resend log review if available |

---

## 2. Stop Conditions

| Condition | Required Action |
|-----------|-----------------|
| Dashboard is live mode | **STOP** |
| Event type is not `checkout.expired` | **STOP** |
| Endpoint differs from approved URL | **STOP** |
| Stripe offers bulk replay / multiple events | **STOP** |
| A resend was already clicked in this proof window | **STOP** |
| Any deploy/env/settings edit is requested | **STOP** |

---

## 3. Safety Attestation

| Action | Result |
|--------|--------|
| Stripe sandbox resend | **NO** |
| Live-mode action | **NO** |
| New checkout/payment | **NO** |
| Broad replay / arbitrary test event | **NO** |
| Deploy / redeploy | **NO** |
| Vercel/Stripe settings edit | **NO** |
| Env edit | **NO** |
| Manual DB/payment/wallet/order mutation | **NO** |
| Self-healing apply | **NO** |

---

## 4. Current Verdict

| Item | Status |
|------|--------|
| Sandbox checkout.expired resend proof | **NOT EXECUTED** |
| HTTP 2xx Stripe processing | **NOT ACHIEVED** |
| Stripe event processing | **NOT PROVEN** |
| Fix | **NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |

---

*Manifest - resend proof not executed because operator conditions are not confirmed*
