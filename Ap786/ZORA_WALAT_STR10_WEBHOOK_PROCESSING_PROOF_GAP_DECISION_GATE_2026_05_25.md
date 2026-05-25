# STR-10 Webhook Processing Proof Gap Decision Gate

**Date:** 2026-05-25
**Status:** **DECISION GATE FILED / NO ACTION EXECUTED**

---

## 1. Purpose

STR-10 closes no technical gap by itself. It records the remaining webhook proof gap after STR-08 and STR-09, reconciles the available evidence, and defines the safest next engineering decision path.

This decision gate is docs/evidence/governance only. It does not approve implementation, deploy, probe, replay, resend, DB migration, Stripe operation, Vercel operation, or production readiness.

---

## 2. Current Evidence Baseline

| Evidence | Status |
|----------|--------|
| STR-08 invalid-signature probe | **EXECUTED EXACTLY ONCE** |
| STR-08 HTTP result | **CONTROLLED HTTP `400` REJECTION CAPTURED** |
| STR-08 Vercel marker searches | **CAPTURED AS NOT FOUND / NO LOGS FOUND** |
| STR-09 Stripe-side delivery/resumption email | **CAPTURED** |
| Stripe endpoint in STR-09 email | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Stripe-side test-mode delivery/resumption evidence | **EXISTS** |
| Vercel runtime marker correlation | **MISSING / NOT FOUND / INCONCLUSIVE** |
| Full app-side webhook processing proof | **MISSING / NOT PROVEN** |
| DB/payment/wallet/order mutation correctness | **NOT PROVEN** |
| Production / live mode / real-money / controlled pilot readiness | **NO-GO** |
| Fix fully proven | **NO** |

---

## 3. Read-Only Source Review Summary

| File | Read-only finding |
|------|-------------------|
| `vercel.json` | Root deployment rewrites `/webhooks/stripe` to `/api/webhooks/stripe`. |
| `api/webhooks/stripe.mjs` | Root bridge accepts `POST`, rewrites request URL to `/webhooks/stripe`, and delegates to `server/api/slimStripeWebhookHandler.mjs`. |
| `server/api/index.mjs` | Server deployment routes `POST /webhooks/stripe` to `handleSlimStripeWebhookPost`. |
| `server/api/slimStripeWebhookHandler.mjs` | Invalid signatures return controlled `400`; verified events may process slim paths or replay to Express. |
| `server/vercel.json` | Server deployment routes all paths to `api/index.mjs`. |
| `server/api/stripeWebhookObservability.mjs` | **Not present on synced `main` during STR-10 read-only review.** |

The current synced `main` source review did not find the `ZW_STRIPE_WEBHOOK_OBSERVABILITY` marker implementation. STR-07 references the planned/expected marker, while STR-08 screenshots show the marker searches returned no logs. STR-10 records this as a reconciliation issue, not as a final root-cause claim.

---

## 4. Decision Gate

Recommended next safest path:

```text
Prepare a gated implementation plan for durable, non-money, staging-safe webhook audit evidence.
```

The preferred path should produce deterministic evidence of route entry, signature outcome, event id/type after verification, idempotency decision, and final ACK without proving or mutating money-path state by accident.

No implementation may start without explicit approval. No deploy, probe, Stripe replay/resend/test event, Vercel operation, DB migration, or payment/order/wallet action may occur under STR-10.

---

## 5. Required Future Approval Boundary

Any future action must use a new explicit approval phrase and a separate scope. Examples:

- Implementation approval for durable non-money audit evidence.
- Deployment approval after code review and tests.
- Probe/replay approval after deployment evidence exists.
- DB migration approval if persistence is required.

STR-10 approves none of those actions.

---

## 6. Conservative Verdict

Stripe-side delivery recovery/resumption evidence exists, and controlled invalid-signature rejection evidence exists. The remaining proof gap is app-side processing evidence: Vercel runtime marker correlation, durable handler execution proof, and DB/payment/wallet/order correctness remain unproven.

Production, live mode, real-money, and controlled pilot remain **NO-GO**.

---

*STR-10 decision gate - governance only; no operational action executed.*
