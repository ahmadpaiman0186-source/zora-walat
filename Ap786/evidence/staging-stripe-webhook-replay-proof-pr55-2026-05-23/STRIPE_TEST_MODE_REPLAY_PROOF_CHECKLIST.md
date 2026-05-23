# Stripe Test-Mode Replay Proof — Operator Checklist (PR #55)

**Date:** 2026-05-23
**Status:** **PENDING OPERATOR EXECUTION**
**Evidence IDs:** STR-01, STR-02
**Endpoint (staging only):** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`

---

## 1. Purpose

Capture **read-only** Stripe Dashboard proof that `checkout.session.expired` delivers **HTTP 200** to **staging** after PR #55 — using **test mode only**.

**Forbidden:** Live mode · production endpoint · new real payments · refunds · wallet credit · Agent Stripe API calls.

---

## 2. Preconditions

| # | Check | Status |
|---|-------|--------|
| S-01 | [STAGING_DEPLOYMENT_PROOF_OPERATOR_CHECKLIST.md](./STAGING_DEPLOYMENT_PROOF_OPERATOR_CHECKLIST.md) DEP-01 **EVIDENCE FILED** | **PENDING CAPTURE** |
| S-02 | Stripe Dashboard in **Test mode** (toggle visible in capture) | **PENDING OPERATOR** |
| S-03 | Staging webhook endpoint configured (read-only verify) | **PENDING OPERATOR** |
| S-04 | G-02 ticket / approval window | **REQUIRED** |
| S-05 | Prior failure evidence reviewed ([2026-05-22 folder](../stripe-webhook-failure-2026-05-22/README.md)) | **RECOMMENDED** |

---

## 3. Operator steps

### 3.1 Before replay (STR-01)

| Step | Action | Evidence |
|------|--------|----------|
| 1 | Stripe Dashboard → **Developers** → **Webhooks** → select **staging** endpoint URL | Test mode on |
| 2 | Open **Event deliveries** or **Events** → filter `checkout.session.expired` | List visible |
| 3 | Select target event (existing failed row **or** newly expired test checkout) | Pre-replay status visible |
| 4 | Screenshot → `STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-BEFORE-001.png` | **PENDING CAPTURE** |

**Do not** resend May 19 production-correlated events without ticket scope documented in Ap786.

### 3.2 Execute replay (operator only)

| Method | When to use | Safety |
|--------|-------------|--------|
| **A — Dashboard Resend** | Existing test-mode `checkout.session.expired` event | Same `event.id` → also capture LOG-05 |
| **B — New test checkout expiry** | Fresh test session allowed to expire naturally or via test clock | New event id; no duplicate LOG-05 |

| Step | Action | Forbidden |
|------|--------|-----------|
| 1 | Record UTC timestamp of replay attempt | Live mode |
| 2 | Trigger resend **once** (method A or B) | Production endpoint URL |
| 3 | Wait for delivery result in Dashboard | CLI `stripe trigger` unless operator-approved |
| 4 | **Do not** mutate DB, orders, or wallets to “fix” state | Manual SQL |

### 3.3 After replay (STR-02)

| Step | Action | Pass signal |
|------|--------|-------------|
| 1 | Open delivery detail for replay attempt | HTTP **200** |
| 2 | Confirm response time within Stripe webhook timeout | No **Failed** / timeout |
| 3 | Screenshot → `STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-AFTER-200-001.png` | **PENDING CAPTURE** |
| 4 | Note redacted event id in operator log (not full id in git if policy requires) | `REDACTED_EVT_*` |

---

## 4. Optional duplicate replay (LOG-05)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Resend **same** Stripe `event.id` a second time (method A only) | Second delivery **200** |
| 2 | Correlate Vercel log `duplicate_event_blocked` | See [VERCEL_LIFECYCLE_LOG_PROOF_CHECKLIST.md](./VERCEL_LIFECYCLE_LOG_PROOF_CHECKLIST.md) |
| 3 | Screenshot → `VERCEL-STAGING-LOG-DUPLICATE-BLOCKED-001.png` | **PENDING CAPTURE** |

If duplicate replay **not** performed, document **N/A** — do not mark LOG-05 PASS.

---

## 5. Redaction rules

| Field | Rule |
|-------|------|
| Stripe account ID | `REDACTED_STRIPE_ACCOUNT_ID` |
| Event IDs | `REDACTED_EVT_*` |
| Customer email / phone | Blur |
| Signing secret | **Never** in capture |

---

## 6. Exit criteria

| # | Criterion | Status |
|---|-----------|--------|
| E-STR-01 | STR-01 filed (before state) | **PENDING CAPTURE** |
| E-STR-02 | STR-02 filed (HTTP 200 after replay) | **PENDING CAPTURE** |
| E-STR-03 | Test mode visible in both captures | **PENDING CAPTURE** |
| E-STR-04 | Staging endpoint URL visible (not production) | **PENDING CAPTURE** |

**Stripe replay proof:** **NOT PASS**

---

## 7. Verdict boundaries

| Item | Status |
|------|--------|
| Staging `checkout.session.expired` delivery 200 | **PENDING CAPTURE** |
| Fix proven | **NOT YET** |
| May 19 root cause | **NOT CONFIRMED** |
| Production / pilot | **NO-GO** |

---

*Stripe test-mode replay checklist · operator-only · no Agent replay*
