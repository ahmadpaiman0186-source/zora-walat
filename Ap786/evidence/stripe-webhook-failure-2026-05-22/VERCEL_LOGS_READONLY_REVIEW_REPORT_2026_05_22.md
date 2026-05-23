# Vercel Logs Read-only Review Report

**Date:** 2026-05-22
**Mode:** **READ-ONLY ONLY**
**Target project:** `zora-walat-api-staging` (staging)
**Manifest:** [STRIPE_VERCEL_READONLY_EVIDENCE_MANIFEST_2026_05_22.md](./STRIPE_VERCEL_READONLY_EVIDENCE_MANIFEST_2026_05_22.md)

**Policy:** Read-only review with **1 redacted Vercel log PNG filed 2026-05-22**. No Vercel env/deploy mutation. No fake logs.

---

## 1. Purpose

Define **read-only** Vercel staging evidence for correlating Stripe webhook **timeouts** with function behavior, deployment state, and route health.

---

## 2. Read-only Vercel review scope

| In scope | Out of scope |
|----------|--------------|
| Function logs (read) | Env var edit |
| Deployment list / SHA | Redeploy |
| Log export (redacted) | Production project |
| Route health notes | Secret display |

---

## 3. Target project / environment

| Field | Value |
|-------|-------|
| **Hostname** | `zora-walat-api-staging.vercel.app` |
| **Route** | `/webhooks/stripe` |
| **Environment** | Staging / preview production-like |
| **Correlation** | Stripe failures from 2026-05-19 21:10:08 UTC |

---

## 4. Time window

| Boundary | UTC |
|----------|-----|
| **Anchor** | 2026-05-19 21:10:08 — first failure |
| **Recommended window start** | 2026-05-19 19:10:08 (−2h) |
| **Recommended window end** | 2026-05-19 23:10:08 (+2h) |
| **Extended (optional)** | Through 2026-05-22 for recurrence |

---

## 5. Logs to capture

| Log type | Artifact ID | Redaction |
|----------|-------------|-----------|
| Function invocations for webhook route | VERCEL-STAGING-FUNCTION-LOGS-001 | Request IDs, env dumps |
| Duration / timeout messages | VERCEL-STAGING-FUNCTION-LOGS-001 | PII |
| 5xx vs timeout classification | VERCEL-STAGING-FUNCTION-LOGS-001 | Stack traces with secrets |
| Cold start indicators (if present) | VERCEL-STAGING-FUNCTION-LOGS-001 | N/A |

---

## 6. Deployment state evidence

| Evidence | Artifact ID | Status |
|----------|-------------|--------|
| Active deployment SHA at failure time | VERCEL-STAGING-DEPLOYMENT-STATE-001 | **PENDING CAPTURE** |
| Deploy timestamp vs failure timestamp | VERCEL-STAGING-DEPLOYMENT-STATE-001 | **PENDING CAPTURE** |
| Recent deploys in window | VERCEL-STAGING-DEPLOYMENT-STATE-001 | **PENDING CAPTURE** |

---

## 7. Function timeout evidence

| Check | Status |
|-------|--------|
| Wall-clock duration near platform limit | **PENDING EVIDENCE** |
| Explicit timeout error in logs | **PENDING EVIDENCE** |
| Unhandled exception vs slow I/O | **NOT PROVEN** |
| Comparison to Stripe delivery timeout | **NOT PROVEN** |

---

## 8. Route-level health evidence

| Check | Artifact ID | Status |
|-------|-------------|--------|
| `/api/health` staging | VERCEL-STAGING-ROUTE-HEALTH-001 | **PENDING CAPTURE** |
| `/api/ready` staging | VERCEL-STAGING-ROUTE-HEALTH-001 | **PENDING CAPTURE** |
| Webhook route reachable (no live charge) | VERCEL-STAGING-ROUTE-HEALTH-001 | **NOT EXECUTED** |

---

## 9. Findings table

| Finding ID | Observation | Status | Evidence artifact |
|------------|-------------|--------|-------------------|
| VC-F-01 | Function invoked during failure window | **NOT PROVEN** | No invocation rows in filed search |
| VC-F-02 | Log shows timeout / duration exceeded | **PENDING EVIDENCE** | VERCEL-STAGING-FUNCTION-LOGS-001 |
| VC-F-03 | Deployment SHA identified | **PENDING EVIDENCE** | VERCEL-STAGING-DEPLOYMENT-STATE-001 |
| VC-F-04 | Cold start correlated | **NOT PROVEN** | VERCEL-STAGING-FUNCTION-LOGS-001 |
| VC-F-05 | Staging app sleeping / unavailable | **NOT PROVEN** | VERCEL-STAGING-ROUTE-HEALTH-001 |
| VC-F-06 | Production logs reviewed | **NOT PROVEN** | Out of scope |
| VC-F-07 | Logs search `"/webhooks/stripe"` → **no matching logs** in selected timeline | **EVIDENCE FILED (redacted)** | [VERCEL-STAGING-LOGS-NO-MATCH-WEBHOOK-STRIPE-001.png](./VERCEL-STAGING-LOGS-NO-MATCH-WEBHOOK-STRIPE-001.png) |

**Note:** VC-F-07 does **not** prove the handler never ran; window/filter may exclude invocations. Timeout root cause **NOT confirmed**.

---

## 10. Current status

| Item | Status |
|------|--------|
| Vercel review executed | **PARTIAL EVIDENCE FILED** |
| Log artifacts in repo | **1 redacted PNG FILED** (no-match search) |
| Function invocation proof | **NOT PROVEN** |
| Root cause confirmed | **NOT CONFIRMED** |
| Webhook fix | **NOT FIXED** |

---

## 11. No mutation confirmation

| Check | Status |
|-------|--------|
| Env vars changed | **NOT EXECUTED** |
| Redeploy triggered | **NOT EXECUTED** |
| Project settings changed | **NOT EXECUTED** |
| Function config changed | **NOT EXECUTED** |

---

## 12. Final verdict

| Verdict | Value |
|---------|-------|
| **Report type** | **Read-only review — partial evidence filed** |
| **Vercel logs evidence** | **1 redacted PNG FILED** (no-match); invocation/timeout **PENDING** |
| **Staging webhook health** | **FAILED / PENDING INVESTIGATION** |
| **Production webhook health** | **NOT PROVEN** |
| **Webhook fix** | **NOT EXECUTED** |
| **Vercel mutation (repo task)** | **NOT EXECUTED** |

**Next action:** Widen log window or capture invocation rows; file deployment SHA evidence.

---

*Vercel Logs Report · 1 redacted PNG filed · root cause NOT confirmed*
