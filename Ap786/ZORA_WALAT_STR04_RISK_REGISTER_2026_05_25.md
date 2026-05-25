# STR-04 Risk Register

**Date:** 2026-05-25
**Status:** **OPEN - INVESTIGATION ONLY**

---

## 1. Risk Summary

STR-04 exists because STR-03 produced Stripe-side HTTP `200 OK` evidence without visible Vercel runtime correlation. The main risk is overclaiming full webhook processing when only delivery acceptance is currently evidenced.

---

## 2. Risk Register

| ID | Risk | Severity | Current Control | Status |
|----|------|----------|-----------------|--------|
| STR04-R01 | Treating Stripe `200 OK` delivery as full application processing proof | **Critical** | Conservative verdict requires Vercel correlation before fix-proof claim | **OPEN** |
| STR04-R02 | Searching the wrong Vercel project, deployment, or time window | **High** | Future read-only capture checklist requires project/deployment/time proof | **OPEN** |
| STR04-R03 | Missing logs due to Vercel UI filter, retention, truncation, or visibility behavior | **High** | H1/H7 remain open until read-only evidence is captured | **OPEN** |
| STR04-R04 | Missing instrumentation for `checkout.session.expired` lifecycle/idempotency logs | **High** | Future static source review plan records instrumentation questions | **OPEN** |
| STR04-R05 | Route/proxy/bridge returns before expected app logger | **High** | H3/H8 tracked in hypothesis matrix | **OPEN** |
| STR04-R06 | Logs emitted to alternate logger/sink not visible in Vercel UI | **Medium** | Future logger sink review required | **OPEN** |
| STR04-R07 | Operator accidentally changes Vercel settings/env while capturing evidence | **Critical** | Capture plan forbids settings/env edits | **OPEN** |
| STR04-R08 | Operator triggers Stripe resend/replay/test event during investigation | **Critical** | STR-04 forbids Stripe actions; capture plan is read-only | **OPEN** |
| STR04-R09 | Secret exposure in screenshots or docs | **High** | Redaction required; secrets scan required before commit | **OPEN** |
| STR04-R10 | Self-healing or patch apply executed before human approval | **Critical** | Self-healing apply remains **GATED / NOT ENABLED** | **OPEN** |

---

## 3. Launch Boundary

| Claim | Current Status |
|-------|----------------|
| Production-ready | **NO-GO** |
| Real-money-ready | **NO-GO** |
| Controlled pilot ready | **NO-GO** |
| Fix fully proven | **NO** |
| Full webhook processing proven | **NO** |

---

## 4. Required Mitigations Before Reducing Risk

| Mitigation | Required Evidence |
|------------|-------------------|
| Correct Vercel search context | Project, deployment, and time window screenshots |
| Filter coverage | `/webhooks/stripe`, `stripe`, `checkout.session.expired`, `evt_...`, `webhook`, `idempotency`, `ack` captures |
| Route/function view | `/webhooks/stripe` route/function/resource evidence |
| Runtime context | Deployment runtime/function details |
| Static source map | Route, handler, logger, ACK order, and lifecycle instrumentation review |

---

## 5. Conservative Verdict

Stripe-side delivery proof is **HTTP 200 OK CAPTURED**. Vercel runtime correlation is **NOT FOUND / INCONCLUSIVE**. Full processing proof remains **NOT FULLY PROVEN**. Fix remains **PARTIAL / NOT FULLY PROVEN**. Production, real-money, and controlled pilot remain **NO-GO**.

---

*Risk register - no risk closed by STR-04 documentation alone*
