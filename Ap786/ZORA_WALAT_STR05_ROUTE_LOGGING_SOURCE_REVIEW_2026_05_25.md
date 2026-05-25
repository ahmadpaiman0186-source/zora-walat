# STR-05 Route Logging Source Review

**Date:** 2026-05-25
**Status:** **SOURCE REVIEW ONLY - ROOT CAUSE NOT CONFIRMED**
**Scope:** Read-only source/config review plus Ap786 documentation.

---

## 1. Purpose

STR-05 reviews route and logging source code to investigate why STR-03 captured Stripe sandbox delivery as HTTP `200 OK`, while Vercel visible runtime log correlation remained **NOT FOUND / INCONCLUSIVE**.

No implementation, config, env, deployment, Stripe, Vercel API, DB, payment, wallet, order, credential, or self-healing action was authorized or performed.

---

## 2. Source Files Reviewed

| Area | Source Reviewed | Read-Only Finding |
|------|-----------------|-------------------|
| Root Vercel rewrite | `vercel.json` | `/webhooks/stripe` rewrites to `/api/webhooks/stripe` on root deployment |
| Root Vercel bridge | `api/webhooks/stripe.mjs` | Root bridge supports `POST`, rewrites `req.url` to `/webhooks/stripe`, and delegates to slim webhook handler |
| Serverless API entry | `server/api/index.mjs` | Server API entry directly handles `POST /webhooks/stripe` before full Express bootstrap |
| Slim webhook handler | `server/api/slimStripeWebhookHandler.mjs` | Verifies Stripe signature, emits lifecycle logs, handles hosted checkout completed/expired and charge refunded slim paths, then returns HTTP `200` for handled cases |
| Expired checkout slim path | `server/api/slimStripeWebhookCheckoutExpired.mjs` | Has explicit `checkout.session.expired` processing, idempotency, event persistence, completion/failure lifecycle logs |
| Express app mount | `server/src/app.js` | Mounts `/webhooks/stripe` before global JSON parsing with raw body and ingress logger |
| Express webhook route | `server/src/routes/stripeWebhook.routes.js` | Has full Express webhook handling, lifecycle logs, idempotency row, duplicate handling, and final ACK logging |
| Lifecycle logger | `server/src/lib/stripeWebhookLifecycleLog.js` | Emits JSON to `console.log` with route `/webhooks/stripe` and redacted fields |
| Web top-up logger | `server/src/lib/webTopupObservability.js` | Uses pino logger when available and appends durable webtop logs |

---

## 3. Source Review Findings

| ID | Finding | Confidence | Claim Boundary |
|----|---------|------------|----------------|
| STR05-F01 | The root deployment supports `/webhooks/stripe` via Vercel rewrite to `/api/webhooks/stripe`; the root bridge function also exists at `/api/webhooks/stripe`. | **HIGH** | Route support is source-visible; deployed behavior still requires Vercel evidence. |
| STR05-F02 | The server deployment/server API path handles `POST /webhooks/stripe` directly and also mounts Express `/webhooks/stripe`. | **HIGH** | Root and server deployment surfaces are not identical. |
| STR05-F03 | The slim handler emits route/lifecycle logs through `console.log` and returns HTTP `200` after handled slim processors or fast ACK paths. | **HIGH** | Console log emission in source does not prove Vercel UI visibility. |
| STR05-F04 | `checkout.session.expired` has explicit slim-path processing logs: `processing_started`, `event_persisted`, `processing_completed`, `processing_failed`, and duplicate handling. | **HIGH** | This proves instrumentation exists in source, not that STR-03 logs were visible. |
| STR05-F05 | Lifecycle logs intentionally use `stripeEventIdSuffix`, not the full Stripe `evt_...` event ID, in production-oriented paths. | **HIGH** | Searching Vercel logs for the full `evt_...` may not match these redacted lifecycle logs. |
| STR05-F06 | The root bridge itself does not add a dedicated route-entry log containing request path and method before calling the slim handler. | **MEDIUM** | Slim lifecycle logs still exist after entry; this is an observability improvement candidate, not root cause. |
| STR05-F07 | Express ingress logging uses `req.log`/pino, while lifecycle logging uses `console.log`; visibility may differ by runtime/sink/context. | **MEDIUM** | Logger sink mismatch is plausible but not confirmed as the STR-03 gap. |
| STR05-F08 | `callbackWaitsForEmptyEventLoop: false` is configured for serverless-http bridges. | **MEDIUM** | This supports serverless response flushing behavior, but does not prove log loss. |

---

## 4. What Stripe HTTP 200 Proves

Stripe-side HTTP `200 OK` proves the staging endpoint accepted the webhook delivery at the HTTP boundary for STR-03.

It does **not** by itself prove:

- Vercel-visible route receipt logs.
- Full event ID correlation.
- Durable idempotency lifecycle.
- Final business-state processing.
- Production readiness.
- Real-money readiness.

---

## 5. Conservative Verdict

| Item | Status |
|------|--------|
| STR-05 | **SOURCE REVIEW ONLY** |
| Stripe-side delivery proof | **HTTP 200 OK CAPTURED** |
| Vercel runtime correlation | **NOT FOUND / INCONCLUSIVE** |
| Full processing proof | **NOT FULLY PROVEN** |
| Fix | **PARTIAL / NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-05 narrows observability questions but does not claim root cause or fix proof.*
