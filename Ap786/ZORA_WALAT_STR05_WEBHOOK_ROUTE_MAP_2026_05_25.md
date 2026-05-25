# STR-05 Webhook Route Map

**Date:** 2026-05-25
**Status:** **READ-ONLY ROUTE MAP - DEPLOYED RUNTIME NOT RE-PROBED**

---

## 1. Route Surfaces

| Surface | Source Evidence | Route Behavior |
|---------|-----------------|----------------|
| Root Vercel deployment | `vercel.json` | Rewrites `/webhooks/stripe` to `/api/webhooks/stripe` |
| Root Vercel function | `api/webhooks/stripe.mjs` | Handles `POST`, rejects unsupported methods, rewrites request URL to `/webhooks/stripe`, delegates to slim handler |
| Server API function | `server/api/index.mjs` | Directly handles `POST /webhooks/stripe` and imports slim handler |
| Express app | `server/src/app.js` | Mounts `/webhooks/stripe` before JSON parser with raw body and rate limiter |
| Express route | `server/src/routes/stripeWebhook.routes.js` | Processes verified Stripe events through full Express path |

---

## 2. Current Route Map

```text
External Stripe target:
  https://zora-walat-api-staging.vercel.app/webhooks/stripe

Root deployment:
  /webhooks/stripe
    -> vercel.json rewrite
    -> /api/webhooks/stripe
    -> api/webhooks/stripe.mjs
    -> req.url rewritten to /webhooks/stripe
    -> server/api/slimStripeWebhookHandler.mjs

Server deployment / full serverless entry:
  POST /webhooks/stripe
    -> server/api/index.mjs
    -> server/api/slimStripeWebhookHandler.mjs
    -> handled slim path OR replay into Express
    -> server/src/app.js mount /webhooks/stripe
    -> server/src/routes/stripeWebhook.routes.js
```

---

## 3. `/webhooks/stripe` vs `/api/webhooks/stripe`

| Path | Source-Supported Meaning | Caveat |
|------|--------------------------|--------|
| `/webhooks/stripe` | Intended external Stripe webhook path on root deployment; rewritten by Vercel to root API bridge | Runtime evidence still needed for each deployment |
| `/api/webhooks/stripe` | Root Vercel function path for `api/webhooks/stripe.mjs` | Source-supported as a function path, but not the configured Stripe target path |
| Server `POST /webhooks/stripe` | Server API entry and Express app route | Applies to server deployment surface, not necessarily root Next deployment without bridge/rewrite |

---

## 4. Root vs Server Deployment Difference

| Dimension | Root Deployment | Server Deployment |
|-----------|-----------------|-------------------|
| Config entry | `vercel.json` at repo root | `server/api/index.mjs` if server folder is exposed |
| Webhook bridge | `api/webhooks/stripe.mjs` | `server/api/index.mjs` direct handler |
| Express bootstrap | Bridge imports `createValidatedApp()` via serverless-http cache | Server API entry imports `createValidatedApp()` via serverless-http cache |
| External path | `/webhooks/stripe` via rewrite | `/webhooks/stripe` directly in server API entry |
| Direct API function path | `/api/webhooks/stripe` | Not the same as root function bridge |

---

## 5. Observability Implication

Because root and server route surfaces differ, STR-04/STR-05 future Vercel evidence must prove:

- Selected project is `zora-walat-api-staging`.
- Selected deployment is the one receiving STR-03 traffic.
- Route/function/resource view includes the webhook bridge or direct server handler being searched.
- Logs are searched in the deployment/runtime context that actually accepted Stripe's HTTP `200 OK`.

---

## 6. Conservative Verdict

The source route map supports the intended routing design, but it does not prove Vercel visible runtime correlation for STR-03. Stripe-side delivery proof remains **HTTP 200 OK CAPTURED**; Vercel runtime correlation remains **NOT FOUND / INCONCLUSIVE**; full processing remains **NOT FULLY PROVEN**.

---

*Webhook route map - no runtime probe or deployment action performed*
