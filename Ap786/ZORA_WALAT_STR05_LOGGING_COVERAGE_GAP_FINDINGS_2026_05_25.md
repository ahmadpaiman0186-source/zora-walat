# STR-05 Logging Coverage Gap Findings

**Date:** 2026-05-25
**Status:** **SOURCE FINDINGS - RUNTIME CORRELATION STILL INCONCLUSIVE**

---

## 1. Logging Sources Identified

| Logger / Sink | Source | Observed Use |
|---------------|--------|--------------|
| `console.log` lifecycle JSON | `server/src/lib/stripeWebhookLifecycleLog.js` | Emits `zora.stripe_webhook_lifecycle.v1` records with route `/webhooks/stripe` |
| Slim breadcrumb console logs | `server/api/slimStripeWebhookHandler.mjs` | Emits `zora.webhook_slim.v1` events for slim entry, signature status, unmatched fast ACK, and unhandled errors |
| Pino request/app logger | `server/src/app.js`, `server/src/routes/stripeWebhook.routes.js` | Express ingress and web top-up logs use `req.log` when available |
| Durable webtop log sink | `server/src/lib/webTopupObservability.js` | Appends sanitized webtop events to durable sink and emits through pino when provided |

---

## 2. Coverage Findings

| ID | Finding | Impact |
|----|---------|--------|
| STR05-L01 | Lifecycle logs include `route: "/webhooks/stripe"` and structured event names. | Searching for `/webhooks/stripe` should be plausible if those console logs are visible in the searched Vercel context. |
| STR05-L02 | Lifecycle logs record `stripeEventIdSuffix`, not the full Stripe `evt_...` ID. | A future full event ID search may not find production lifecycle logs by design; suffix search may be needed. |
| STR05-L03 | Slim `checkout.session.expired` handling logs `processing_started`, `event_persisted`, `processing_completed`, `processing_failed`, duplicate blocks, and ACK return. | Source has explicit lifecycle instrumentation for correlated hosted-checkout expiration. |
| STR05-L04 | The root bridge has no separate pre-handler route-entry log containing request method/path. | If slim logs are missing or hidden, there is no bridge-specific visible breadcrumb for path/method. |
| STR05-L05 | Express ingress logging uses pino `req.log`, not the same helper as slim `console.log` lifecycle logging. | Different logger paths may appear differently in Vercel or other sinks. |
| STR05-L06 | `checkout.session.expired` service logs `no_pay_no_service_blocked` only for a not-pending order branch; normal pending-to-cancelled success is reflected by processor `processing_completed` with `stateTransition`. | Explicit event-specific logs exist, but branch-level semantics are uneven. |
| STR05-L07 | Slim handler can return `200` error ACK for unhandled errors while logging an error ACK path. | Stripe `200 OK` can represent safe ACK behavior, not necessarily durable full processing. |
| STR05-L08 | No Vercel `functions` runtime/maxDuration/logging configuration was found in root `vercel.json`. | No source-level Vercel log-retention or runtime log setting explains the gap directly. |

---

## 3. Directly Supported Narrowing

The strongest source-backed narrowing is:

```text
Full Stripe event IDs are not logged in the production-oriented lifecycle records reviewed.
Lifecycle records use stripeEventIdSuffix instead.
```

This may explain why a Vercel search for `evt_...` did not find correlation, but it does **not** explain by itself why broader filters such as `/webhooks/stripe`, `stripe`, `idempotency`, or `ack` were not visible in STR-03.

---

## 4. Open Observability Gaps

| Gap | Status |
|-----|--------|
| Did STR-03 hit the exact deployment searched in Vercel Logs? | **OPEN** |
| Were console lifecycle logs visible in Vercel for the root bridge function? | **OPEN** |
| Were pino ingress logs visible in the same Vercel search surface? | **OPEN** |
| Did the event take matched slim expired path, unmatched fast ACK path, or error ACK path? | **OPEN** |
| Was the event ID searched by full ID instead of redacted suffix? | **OPEN / LIKELY RELEVANT** |

---

## 5. Conservative Verdict

STR-05 identifies logging coverage and searchability gaps, but does not prove the STR-03 runtime correlation root cause. Stripe-side delivery proof remains **HTTP 200 OK CAPTURED**. Vercel runtime correlation remains **NOT FOUND / INCONCLUSIVE**. Full processing remains **NOT FULLY PROVEN**.

---

*Logging coverage findings - source review only, no runtime proof captured*
