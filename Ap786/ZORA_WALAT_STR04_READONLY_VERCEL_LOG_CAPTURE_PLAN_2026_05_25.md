# STR-04 Read-Only Vercel Log Capture Plan

**Date:** 2026-05-25
**Status:** **PLAN ONLY - DO NOT CAPTURE NOW**
**Target project:** `zora-walat-api-staging`

---

## 1. Purpose

Define the future read-only evidence needed to investigate why STR-03 has Stripe-side HTTP `200 OK` delivery evidence but no visible Vercel runtime correlation.

No capture, replay, resend, deploy, settings edit, env edit, or API action is authorized by this document.

---

## 2. Future Capture Preconditions

| Check | Required State |
|-------|----------------|
| Stripe mode | Sandbox/test mode only |
| Vercel project | `zora-walat-api-staging` selected |
| Deployment | Correct deployment selected for STR-03 timing |
| Time window | Narrow window around STR-03 delivery |
| Operator action | Read-only screenshots only |
| Forbidden actions | No deploy/redeploy/settings/env edits |

---

## 3. Required Future Evidence Checklist

| Evidence ID | Capture | Required Proof | Status |
|-------------|---------|----------------|--------|
| STR04-VRC-01 | Vercel project selection | `zora-walat-api-staging` visible | **PENDING FUTURE CAPTURE** |
| STR04-VRC-02 | Correct deployment selection | Deployment context visible for STR-03 timeframe | **PENDING FUTURE CAPTURE** |
| STR04-VRC-03 | Time window | STR-03 delivery window selected | **PENDING FUTURE CAPTURE** |
| STR04-VRC-04 | Filter `/webhooks/stripe` | Match or no-match result visible | **PENDING FUTURE CAPTURE** |
| STR04-VRC-05 | Filter `stripe` | Match or no-match result visible | **PENDING FUTURE CAPTURE** |
| STR04-VRC-06 | Filter `checkout.session.expired` | Match or no-match result visible | **PENDING FUTURE CAPTURE** |
| STR04-VRC-07 | Filter `evt_...` | Redacted event ID filter visible | **PENDING FUTURE CAPTURE** |
| STR04-VRC-08 | Filter `webhook` | Match or no-match result visible | **PENDING FUTURE CAPTURE** |
| STR04-VRC-09 | Filter `idempotency` | Match or no-match result visible | **PENDING FUTURE CAPTURE** |
| STR04-VRC-10 | Filter `ack` | Match or no-match result visible | **PENDING FUTURE CAPTURE** |
| STR04-VRC-11 | Function/resource route view | `/webhooks/stripe` route/function/resource context visible | **PENDING FUTURE CAPTURE** |
| STR04-VRC-12 | Runtime/function details | Runtime/function deployment details visible | **PENDING FUTURE CAPTURE** |
| STR04-VRC-13 | No-change attestation | No deploy/redeploy/settings/env edits performed | **PENDING FUTURE CAPTURE** |

---

## 4. Capture Rules

| Rule | Requirement |
|------|-------------|
| Redaction | Hide secrets, tokens, env values, and sensitive account data |
| Scope | Read-only dashboard screenshots only |
| No mutation | No deploy, redeploy, settings, env, Stripe, DB, payment, wallet, or order changes |
| No fake evidence | Do not create or infer screenshots |
| No overclaim | No production-ready, real-money-ready, controlled-pilot-ready, or fix-fully-proven claim |

---

## 5. Exit Criteria For STR-04 Evidence Review

STR-04 may reduce uncertainty only if future read-only captures identify whether Vercel runtime logs are present, absent, hidden, searched in the wrong context, or not instrumented.

Even with future captures, full processing proof requires matching route receipt, event ID correlation, and lifecycle/idempotency/fast ACK evidence.

---

## 6. Current Conservative Verdict

| Item | Status |
|------|--------|
| Stripe-side delivery proof | **HTTP 200 OK CAPTURED** |
| Vercel runtime correlation | **NOT FOUND / INCONCLUSIVE** |
| Full processing proof | **NOT FULLY PROVEN** |
| Fix | **PARTIAL / NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Read-only capture plan - no capture performed in this pack*
