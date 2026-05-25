# STR-04 Observability Gap Hypothesis Matrix

**Date:** 2026-05-25
**Status:** **OPEN HYPOTHESES - ROOT CAUSE NOT CLAIMED**

---

## 1. Baseline

STR-03 captured Stripe-side sandbox evidence, including `checkout.session.expired` trigger success and Stripe delivery to the staging endpoint returning HTTP `200 OK`.

STR-03 did **not** find visible Vercel runtime correlation for `/webhooks/stripe`, the Stripe event ID, idempotency/lifecycle, or fast ACK evidence.

---

## 2. Hypothesis Matrix

| ID | Hypothesis | Current Evidence | Status | What Would Strengthen | What Would Weaken |
|----|------------|------------------|--------|-----------------------|-------------------|
| H1 | Vercel log time range, retention, or filter issue | STR-03 screenshots show no visible matches under selected filters | **OPEN** | Correct deployment and exact STR-03 time window still show no logs across required filters | Logs appear when exact window/filter is corrected |
| H2 | Stripe endpoint is hitting a deployment or project surface not searched in Vercel Logs | Stripe reports HTTP 200, Vercel visible logs show no correlation | **OPEN** | Endpoint/deployment mapping differs from searched project or deployment | Route/function logs appear in searched deployment |
| H3 | Route returns HTTP 200 before durable lifecycle logs are emitted | Stripe delivery `200 OK` captured; lifecycle logs not visible | **OPEN** | Static source review shows ACK before lifecycle logging or async logging without durable sink | Source review shows synchronous durable logging before ACK |
| H4 | Logs are written to different logger, sink, runtime, or deployment context | Vercel UI search found no visible matches | **OPEN** | Source review or read-only runtime evidence shows alternate logger/sink | Required logs visible in Vercel runtime logs |
| H5 | Slim webhook path returns 200 but lifecycle/idempotency logs are not instrumented for `checkout.session.expired` | Delivery succeeds but lifecycle/idempotency filters show no visible matches | **OPEN** | Static route/logging review shows missing instrumentation for this event type | Source and logs prove event-specific lifecycle instrumentation |
| H6 | Stripe Workbench `200 OK` represents delivery acceptance, not full application processing proof | Stripe-side 200 exists without Vercel correlation | **OPEN** | No matching app-level receipt, event ID, or lifecycle logs are found | Matching app logs prove receipt and lifecycle processing |
| H7 | Vercel UI hides or truncates serverless/runtime logs for this route/deployment | Visible UI searches return no matches | **OPEN** | Function/runtime details or logs UI limitations explain absence | Alternative read-only views show complete logs with correlation |
| H8 | Route path or proxy layer handles request before expected app logger | Stripe sees 200 while expected app logger has no visible match | **OPEN** | Route/source review finds bridge/proxy ACK path before app logger | App handler logs correlate directly with Stripe event |

---

## 3. Non-Claims

| Claim | Status |
|-------|--------|
| Root cause confirmed | **NO** |
| Vercel runtime correlation proven | **NO** |
| Full webhook processing proven | **NO** |
| Fix fully proven | **NO** |
| Production / real-money / controlled pilot ready | **NO-GO** |

---

## 4. Conservative Verdict

Stripe-side delivery proof is **HTTP 200 OK CAPTURED**, but Vercel runtime correlation is **NOT FOUND / INCONCLUSIVE**. Full processing proof remains **NOT FULLY PROVEN**, and the fix remains **PARTIAL / NOT FULLY PROVEN**.

---

*Hypothesis matrix - all causes remain open until future read-only evidence is captured*
