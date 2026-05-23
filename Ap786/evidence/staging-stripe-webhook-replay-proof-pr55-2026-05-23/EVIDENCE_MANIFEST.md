# Evidence Manifest — Staging Webhook Replay Proof (PR #55)

**Date:** 2026-05-23
**Merge SHA (main):** `c521b0f` · feature `abb9531`
**Mode:** Stripe **test / sandbox only** · Vercel **staging only**

**Policy:** Every row below starts **PENDING CAPTURE**. No fabricated screenshots. No **PASS** without filed PNG.

---

## 1. Staging deployment proof

| Evidence ID | Filename | Source | Capture instructions | Redaction | Status | Proves | Does not prove |
|-------------|----------|--------|----------------------|-----------|--------|--------|----------------|
| **DEP-01** | [VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png](./VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png) | Vercel Dashboard → `zora-walat-api-staging` → Deployments | Show **Production** or **Preview** staging deployment whose commit matches `c521b0f` or descendant containing PR #55; include deployment timestamp and **Ready** state | Hide team tokens, internal URLs beyond staging host | **PENDING CAPTURE** | Staging runs PR #55 code | Production readiness; fix complete |

---

## 2. Stripe test-mode replay proof

| Evidence ID | Filename | Source | Capture instructions | Redaction | Status | Proves | Does not prove |
|-------------|----------|--------|----------------------|-----------|--------|--------|----------------|
| **STR-01** | [STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-BEFORE-001.png](./STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-BEFORE-001.png) | Stripe Dashboard (test mode) → Developers → Webhooks → staging endpoint → Event deliveries | **Before** replay: show target `checkout.session.expired` event (or delivery row) with status **Failed** or pre-replay state; confirm **Test mode** toggle visible | Event IDs → `REDACTED_EVT_*`; account ID redacted | **PENDING CAPTURE** | Baseline delivery state before PR #55 proof replay | Root cause confirmed |
| **STR-02** | [STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-AFTER-200-001.png](./STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-AFTER-200-001.png) | Same path — delivery detail | **After** approved test-mode replay: HTTP **200**, response time within Stripe limit; event type `checkout.session.expired` | Same as STR-01 | **PENDING CAPTURE** | Staging accepted expired webhook post-PR #55 | Paid / fulfill / wallet effect |

**Replay method (operator only):** Stripe Dashboard **Resend** on an existing **test-mode** `checkout.session.expired` event **or** new test checkout expiry — **never** live mode; **never** production endpoint. Ticket ID required per [STAGING_REPLAY_TEST_PLAN §6](../ZORA_WALAT_STAGING_REPLAY_TEST_PLAN_2026_05_23.md).

---

## 3. Vercel lifecycle log proof

Structured events emitted by PR #55 (`logStripeWebhookLifecycle`):

| Evidence ID | Filename | Log event (search) | Capture instructions | Redaction | Status | Proves | Does not prove |
|-------------|----------|-------------------|----------------------|-----------|--------|--------|----------------|
| **LOG-01** | [VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png](./VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png) | `webhook_received` | Vercel → staging project → Logs; filter ±15 min of STR-02 attempt; show event with `path: slim` or route context | No secrets; redact request IDs if shown | **PENDING CAPTURE** | Handler received webhook | Async worker completion |
| **LOG-02** | [VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png](./VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png) | `signature_verified` | Same window; signature verification succeeded | Same | **PENDING CAPTURE** | Stripe signature OK on staging | Idempotency |
| **LOG-03** | [VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png](./VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png) | `event_persisted` | Same window; persist step before ack | Same | **PENDING CAPTURE** | Event recorded before ack | Business state transition |
| **LOG-04** | [VERCEL-STAGING-LOG-ACK-RETURNED-001.png](./VERCEL-STAGING-LOG-ACK-RETURNED-001.png) | `ack_returned` | Same window; HTTP 200 ack returned | Same | **PENDING CAPTURE** | Fast ack path on staging | Expired handler correctness alone |

**Expected order:** LOG-01 → LOG-02 → LOG-03 → LOG-04 (for first delivery of a new event id).

---

## 4. Duplicate replay proof (conditional)

| Evidence ID | Filename | Log event (search) | Capture instructions | Redaction | Status | Proves | Does not prove |
|-------------|----------|-------------------|----------------------|-----------|--------|--------|----------------|
| **LOG-05** | [VERCEL-STAGING-LOG-DUPLICATE-BLOCKED-001.png](./VERCEL-STAGING-LOG-DUPLICATE-BLOCKED-001.png) | `duplicate_event_blocked` | **If** operator replays **same** Stripe `event.id` twice: second delivery shows duplicate blocked + ack without double effect | Same | **PENDING CAPTURE** | Idempotent duplicate handling on staging | All event types |

**Note:** LOG-05 required only when duplicate replay is executed. If skipped, mark row **NOT APPLICABLE** in operator attestation — do **not** mark PASS.

---

## 5. Manifest completion checklist

| # | Criterion | Status |
|---|-----------|--------|
| M-01 | DEP-01 filed | **PENDING CAPTURE** |
| M-02 | STR-01 filed | **PENDING CAPTURE** |
| M-03 | STR-02 filed | **PENDING CAPTURE** |
| M-04 | LOG-01…LOG-04 filed (correlated window) | **PENDING CAPTURE** |
| M-05 | LOG-05 filed or N/A documented | **PENDING CAPTURE** |
| M-06 | [FINAL_CONSERVATIVE_VERDICT.md](./FINAL_CONSERVATIVE_VERDICT.md) updated by operator | **PENDING** |

**Overall manifest:** **INCOMPLETE** · staging replay **NOT PASS**

---

*Manifest · all rows PENDING CAPTURE · no fabricated evidence*
