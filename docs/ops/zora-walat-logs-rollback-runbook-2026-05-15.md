# Zora-Walat — logs, observability, incident response, and rollback runbook — 2026-05-15

## 1. Executive summary

This runbook maps **where signals come from** today (Vercel function logs, structured JSON lines, Stripe Dashboard deliveries, Prisma errors), defines a **target log taxonomy** aligned with incident triage, states **secret redaction rules**, and documents a **safe Vercel rollback** path for `zora-walat-api-staging` when deploying from `server/` only. It does **not** replace on-call paging configuration or a full SIEM; it gives operators a single checklist.

**Staging alias:** `https://zora-walat-api-staging.vercel.app`  
**Deploy directory (mandatory):** `C:\Users\ahmad\zora_walat\server`

---

## 2. Current observability state

| Surface | Mechanism | Typical signals |
|--------|-------------|-----------------|
| **Cold start / API graph** | `server/api/index.mjs`, `server/bootstrap.js` | `[startup] phase=…` lines; Prisma lazy init notes; Redis rate-limit phases |
| **Fatal startup** | `server/src/runtime/serverLifecycle.js` | JSON line with `event: fatal_startup_gate` (sanitized fields only) |
| **Slim readiness** | `server/api/slimReadyHandler.mjs` | GET `/ready`, `/api/ready` — JSON `database_ok` or bounded error class (no raw secrets) |
| **Liveness** | `server/api/index.mjs` | GET `/api/index`, `/api/health`, `/health` — fast 200 without full app |
| **Stripe webhook (slim)** | `server/api/slimStripeWebhookHandler.mjs` | `webhook_slim_entry`, `webhook_signature_verified_handoff`, `webhook_slim_unmatched_fast_ack` (`schema: zora.webhook_slim.v1`, **event id suffix only**) |
| **Stripe webhook (full)** | `server/src/routes/stripeWebhook.routes.js`, money-path logs | `webhook_received`, `webhook_processing_*`, Prisma `P2002` duplicate path, phase1 observability |
| **Checkout / payment** | Controllers + `emitMoneyPathLog` / phase1 ops | Correlation via `traceId` / request id where wired |
| **Fulfillment** | `fulfillmentProcessingService.js`, adapters | `fulfillmentProcessingGuard`, provider normalize JSON (`orderIdSuffix` only in many paths) |
| **Vercel** | Dashboard → Deployments / Logs; CLI `vercel logs`, `vercel inspect` | Build failures, invocation errors, timeouts |
| **Stripe** | Workbench → Webhooks → endpoint → **Event deliveries** | HTTP status, response snippet, retry count |

**Dotenv on Vercel:** `server/bootstrap.js` suppresses `[dotenv] ENOENT` **warnings** for missing `server/.env` in **production** only (expected on serverless). Other dotenv errors still warn.

**Upload hygiene:** `server/.vercelignore` excludes `.env`, `.env.local`, `.env.production`, `.env.production.local` from deploy bundles.

---

## 3. Required log taxonomy (target vs today)

Use **structured JSON** where possible (`JSON.stringify({ event, … })`) for grep/Datadog-style ingestion.

| Canonical `event` / name | Purpose | Present today (partial) |
|--------------------------|---------|-------------------------|
| `startup_success` | Process reached serving or handler_ready | `[startup] phase=handler_ready` / request_done |
| `startup_fatal_gate` | Impossible to start safely | `fatal_startup_gate` JSON |
| `health_ok` | Cheap liveness | `/api/health` 200 |
| `ready_ok` / `ready_degraded` | DB readiness | `/ready` JSON |
| `webhook_signature_verified` | Stripe sig OK | `webhook_signature_verified_handoff` + full route `WEBHOOK_VERIFIED` |
| `webhook_ignored_unmatched` | Signed but no internal mapping | Slim: `webhook_slim_unmatched_fast_ack`; full route logs `phase1CheckoutSessionCompletedNoInternalMetadata` patterns |
| `webhook_processed` | Business handling finished | `webhook_processed` / operational events |
| `webhook_duplicate` | Idempotent replay | `webhook_duplicate_ignored`, `P2002`, Redis shadow |
| `checkout_created` | Session/row created | Controller / audit (varies) |
| `payment_marked_paid` | PAID persisted | `phase1 payment completion persisted` / `payment_transition` success |
| `fulfillment_queued` | Attempt #1 queued | `fulfillment attempt #1 queued after payment` |
| `fulfillment_processing` | Claim / adapter start | `fulfillmentProcessingGuard` stages |
| `fulfillment_succeeded` / `fulfillment_failed` | Terminal attempt | Phase1 + provider outcome logs |
| `refund_detected` | charge.refunded / dispute | Stripe route branches + incident apply |
| `rollback_started` / `rollback_completed` | **Human/CLI** | Not auto-logged today — operator records in ticket |

**Gap:** Not every row in the table has a single unified `event` string; some use `pino` / Express `req.log` fields. Trend: add `event: '<name>'` on new logs; do not rename legacy fields in bulk.

---

## 4. Secret redaction rules

**Never log or paste:**

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Restricted keys, OAuth client secrets  
- `DATABASE_URL`, Redis URLs with passwords  
- JWTs, `Authorization` headers, `X-Admin-Secret`, OTPs  
- Full Stripe webhook **raw body** (signature depends on exact bytes; also may embed PII)  
- Provider API keys (Reloadly, etc.)  
- Full customer phone numbers, emails, national IDs — use **suffixes** / hashes already used in code (`safeSuffix`, `orderIdSuffix`)

**Safe substitutes:**

- Stripe: `event.id` last 8–12 chars; `session.id` / `pi_` suffixes only  
- Order: internal `PaymentCheckout.id` / `tw_ord_` suffix  
- Correlation: `traceId` / `x-request-id` when non-secret

---

## 5. Stripe webhook diagnostics

1. **Stripe Dashboard:** Developers → Workbench → **Webhooks** → select `zora-walat-api-staging` endpoint → **Event deliveries**. Confirm **HTTP 2xx** for `checkout.session.completed` and `payment_intent.succeeded` test events.
2. **Vercel logs:** `cd server` then `vercel logs https://zora-walat-api-staging.vercel.app` (or deployment URL). Filter: `webhook_slim`, `webhook_received`, `webhook_processing`, `WEBHOOK`.
3. **Signature failures:** Slim path returns **400**; full path logs signature invalid — **no DB mutation** on bad signature.
4. **Fixtures vs real:** CLI fixtures may hit **slim fast-ack** (`ignored` + `unmatched_event`); real checkouts must carry app metadata and proceed through full handler.

---

## 6. Checkout / payment diagnostics

- **API contract errors:** HTTP 4xx with stable `code` in JSON (see `apiContractCodes`).
- **Truth rejection:** Search logs for `webhook_truth_rejected`, `stripe_amount_currency_mismatch`, `stripe_checkout_session_mismatch`.
- **Stuck PENDING after pay:** Check `StripeWebhookEvent` for `evt_…`; replay from Stripe if idempotent path allows; see `paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay` in code/docs.

---

## 7. Fulfillment diagnostics

- Search: `fulfillmentProcessingGuard`, `fulfillmentQueuedAttemptIdempotent`, `FULFILLMENT_ATTEMPT_ONE_ALREADY_PRESENT`, `emitPhase1DuplicateFulfillmentBlocked`.
- **Paid but not fulfilled:** Reconciliation category `paid_but_not_fulfilled` (see `webtopupReconciliationCategories` and ops scripts).
- **Provider normalize:** `fulfillmentProviderNormalize` JSON lines — verify `outcome` is never upgraded from malformed input to `success`.

---

## 8. Common incident signatures

| Symptom | Likely cause | First actions |
|---------|--------------|---------------|
| `FUNCTION_INVOCATION_FAILED` / 500 on cold paths | Bad env, Prisma init, OOM | `vercel inspect`; check env vars; rollback if sudden after deploy |
| `/webhooks/stripe` 503 early | `STRIPE_WEBHOOK_SECRET` missing/malformed on slim gate | Fix Vercel env; redeploy not always needed if env-only |
| `PrismaClientInitializationError` / P1001 | DB URL / network / pool | Verify `DATABASE_URL`; DB status; **do not** log full URL |
| Webhook 2xx but order not PAID | Metadata mismatch, truth rejection | Stripe session metadata vs `PaymentCheckout` row |
| Duplicate webhooks | Normal | Expect `webhook_duplicate_ignored`, `P2002`, idempotent ops |
| High 429 on checkout | Rate limit / abuse | Redis IP limiter; review `ops` metrics |

---

## 9. Vercel rollback procedure

** Preconditions**

- Repo clean or changes stashed; you know the **last good deployment URL** from Dashboard or `vercel list --prod`.
- You are logged in: `vercel login` (CLI) matches the team that owns the project.

**Identify current production deployment**

```bash
cd C:\Users\ahmad\zora_walat\server
vercel inspect https://zora-walat-api-staging.vercel.app
```

Note the **deployment id** and **URL** (e.g. `https://zora-walat-api-staging-xxxx.vercel.app`).

**List recent production deployments**

```bash
vercel list --prod
```

(Exact flags may vary slightly by CLI version; use `vercel --help` if needed.)

**Rollback (instant routing change, no rebuild)**

Per Vercel docs: `vercel rollback` reverts production to a prior deployment; on some plans rollback depth may be limited to the immediately previous production deployment unless a URL/id is specified.

```bash
vercel rollback
```

Or target a known-good deployment URL or id if your plan/CLI supports it:

```bash
vercel rollback <deployment-url-or-id>
```

**Promote a specific good build to production** (alternative to rollback)

```bash
vercel promote <deployment-url>
```

**What not to do**

- Do **not** `vercel deploy` from monorepo **root** — wrong build output and wrong ignores.
- Do **not** commit `.env` to git or rely on uploading secrets via repo; use Vercel **Environment Variables**.
- Do **not** toggle production env vars without a ticket — webhook secret mismatch causes mass 400/503 on Stripe path.
- Do **not** run Prisma **migrate** in production without approval and backup.

---

## 10. Post-rollback validation checklist

Run from any shell:

```bash
curl.exe --max-time 20 -i https://zora-walat-api-staging.vercel.app/api/index
curl.exe --max-time 20 -i https://zora-walat-api-staging.vercel.app/api/health
curl.exe --max-time 20 -i https://zora-walat-api-staging.vercel.app/ready
```

Then:

1. Stripe **Send test webhook** or CLI `stripe trigger` → confirm **2xx** on deliveries page.
2. Spot-check one **internal** staging checkout (test user) if money-path touched.
3. Tail logs: `vercel logs https://zora-walat-api-staging.vercel.app` for 2–5 minutes — no error storm.

---

## 11. Operator commands (copy-safe)

```bash
cd C:\Users\ahmad\zora_walat\server

# Logs (follow)
vercel logs https://zora-walat-api-staging.vercel.app --follow

# Inspect deployment behind alias
vercel inspect https://zora-walat-api-staging.vercel.app

# List prod deployments
vercel list --prod

# Rollback / promote (see §9)
vercel rollback
vercel promote <deployment-url>

# Health probes
curl.exe --max-time 20 -i https://zora-walat-api-staging.vercel.app/api/index
curl.exe --max-time 20 -i https://zora-walat-api-staging.vercel.app/api/health
curl.exe --max-time 20 -i https://zora-walat-api-staging.vercel.app/ready
```

**Verify `.vercelignore` before any deploy**

```bash
type C:\Users\ahmad\zora_walat\server\.vercelignore
```

Expect `.env` and variants listed.

**Deploy (only when intentionally shipping server code)**

```bash
cd C:\Users\ahmad\zora_walat\server
vercel deploy --prod --yes
```

---

## 12. Remaining gaps

1. **Unified event schema** across Express + serverless entry — partial today (`zora.webhook_slim.v1` vs ad-hoc strings).
2. **Central redaction middleware** for all `console.log` — not present; rely on discipline + code review.
3. **Automated alerts** — runbook assumes humans read Vercel/Stripe; wire PagerDuty/Slack separately.
4. **Rollback audit log** — no application-level `rollback_completed`; use Vercel deployment history + change ticket.
5. **Full `npm test` locally** — blocked without valid `DATABASE_URL`; CI should remain source of truth for green builds.
