# STR-04 Vercel Runtime Correlation Gap Investigation

**Date:** 2026-05-25
**Status:** **INVESTIGATION PACK FILED - NO ROOT CAUSE CLAIM**
**Scope:** Docs/evidence/investigation planning only.

---

## 1. Purpose

STR-04 investigates the gap between Stripe-side STR-03 delivery evidence and missing visible Vercel runtime correlation evidence.

STR-03 evidence currently supports:

| Evidence Area | Status |
|---------------|--------|
| Stripe sandbox/test mode | **CAPTURED** |
| `checkout.session.expired` trigger | **SUCCEEDED** |
| Stripe delivery to staging endpoint | **HTTP 200 OK CAPTURED** |
| Vercel visible runtime log `/webhooks/stripe` | **NOT FOUND / INCONCLUSIVE** |
| Vercel event ID correlation | **NOT FOUND / INCONCLUSIVE** |
| Vercel idempotency/lifecycle log | **NOT FOUND / INCONCLUSIVE** |
| Vercel fast ACK log | **NOT FOUND / INCONCLUSIVE** |

Therefore full webhook processing proof remains **NOT FULLY PROVEN**.

---

## 2. Strict Safety Boundary

| Action | Status |
|--------|--------|
| App/server/lib/API implementation changes | **NOT AUTHORIZED** |
| Deploy / redeploy | **NOT AUTHORIZED** |
| Vercel settings/env/domain changes | **NOT AUTHORIZED** |
| Stripe resend/replay/test event/live mode action | **NOT AUTHORIZED** |
| DB/payment/wallet/order mutation | **NOT AUTHORIZED** |
| Credential rotation | **NOT AUTHORIZED** |
| Self-healing apply | **GATED / NOT ENABLED** |

This pack is documentation and investigation planning only.

---

## 3. Investigation Questions

STR-04 tracks possible causes without claiming any as root cause:

| ID | Question |
|----|----------|
| H1 | Is the Vercel log time range, retention window, or filter selection hiding the relevant runtime logs? |
| H2 | Is Stripe hitting a deployment or project surface that is not the one being searched in Vercel Logs? |
| H3 | Does the route return HTTP 200 before durable lifecycle logs are emitted or persisted? |
| H4 | Are logs written to a different logger, sink, runtime, or deployment context? |
| H5 | Does the slim webhook path return 200 while lifecycle/idempotency logs are not instrumented for `checkout.session.expired`? |
| H6 | Does Stripe Workbench `200 OK` prove delivery acceptance but not full application processing? |
| H7 | Does the Vercel UI hide or truncate serverless/runtime logs for this route or deployment? |
| H8 | Does a route path or proxy layer handle the request before the expected app logger? |

---

## 4. Required Next Evidence - Do Not Capture Now

Future evidence must be read-only and operator-gated:

| Evidence Item | Required Future Capture |
|---------------|-------------------------|
| Vercel project selected | `zora-walat-api-staging` visible |
| Correct deployment selected | Deployment tied to STR-03 timing visible |
| Correct time window | Window around STR-03 delivery visible |
| Filter `/webhooks/stripe` | Search result or no-result state captured |
| Filter `stripe` | Search result or no-result state captured |
| Filter `checkout.session.expired` | Search result or no-result state captured |
| Filter `evt_...` | Redacted event ID filter captured |
| Filter `webhook` | Search result or no-result state captured |
| Filter `idempotency` | Search result or no-result state captured |
| Filter `ack` | Search result or no-result state captured |
| Function/resource route view | `/webhooks/stripe` route/function/resource view captured |
| Deployment runtime/function details | Runtime/function deployment context captured |
| No changes proof | No deploy/redeploy/settings/env edits performed |

---

## 5. Current Conservative Verdict

| Item | Status |
|------|--------|
| Stripe-side delivery proof | **HTTP 200 OK CAPTURED** |
| Vercel runtime correlation | **NOT FOUND / INCONCLUSIVE** |
| Full processing proof | **NOT FULLY PROVEN** |
| Fix | **PARTIAL / NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |
| STR-04 purpose | **Investigate observability/runtime correlation gap before any production or money-path claim** |

---

*STR-04 investigation pack - no root cause claim, no fix-proven claim, no operational action authorized*
