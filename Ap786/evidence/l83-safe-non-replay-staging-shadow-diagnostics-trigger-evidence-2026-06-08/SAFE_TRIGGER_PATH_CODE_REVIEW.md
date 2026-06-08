# L-83 — Safe trigger path code review

**Date:** 2026-06-08
**Scope:** Read-only local discovery (Approval #1)
**Question:** Does an existing path reach `shadow_safety_gate_webhook_diagnostic` on **deployed staging** without Stripe replay, payment, provider, or DB mutation?

**Answer:** **NO — safe trigger path missing.**

---

## 1. Where the diagnostic log is emitted

| Location | Emits `shadow_safety_gate_webhook_diagnostic`? |
|----------|-----------------------------------------------|
| `server/src/reliability/shadowSafetyGate/webhookBoundaryHook.js` | **YES** (when flag enabled + `req.log.info`) |
| `server/src/routes/stripeWebhook.routes.js` | **Only caller** in production route tree |
| Unit tests (`shadowSafetyGateBoundary.test.js`, `shadowSafetyDiagnosticsEnvelope.test.js`) | In-memory mock log — **not staging runtime** |
| `npm run shadow-safety-gate` (`run-shadow-safety-gate.mjs`) | **NO** — L-78 batch CLI; no envelope log event |
| Other routes under `server/src/routes/` | **NO** imports of boundary hook |

**Ripgrep:** `maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary` appears only in `stripeWebhook.routes.js` (lines ~559, ~682) plus tests/index exports.

---

## 2. Flag gate (required for emission)

From `server/src/config/env.js`:

```javascript
shadowSafetyGateWebhookDiagnosticsEnabled:
  process.env.SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED === 'true',
```

Hook early-returns `null` when flag false. L-82 enabled flag on **staging Vercel project only** (operational; see preflight). Flag gate is satisfied on staging **if** hook is reached.

---

## 3. Webhook route entry requirements (`POST /webhooks/stripe`)

From `server/src/app.js` → `stripeWebhook.routes.js`:

| Step | Requirement | Safe non-replay? |
|------|-------------|------------------|
| HTTP ingress | `POST /webhooks/stripe` | Staging network (not approved in L-83 #1) |
| Stripe client + secret | `getStripeClient()` + `env.stripeWebhookSecret` | Requires configured whsec |
| Signature | `stripe.webhooks.constructEvent(req.body, sig, secret)` | **Requires valid Stripe-Signature** |
| Invalid/missing sig | Returns **400** — hook **not reached** | N/A |

**Conclusion:** Any HTTP path to the hook requires a **Stripe-signed webhook body**. Generating a valid signature without Stripe tooling implies synthetic signed event or replay — **forbidden under L-83**.

---

## 4. Hook call site A — primary post-commit (~line 682)

**Preconditions (all required):**

1. Signature-verified Stripe `event`
2. DB transaction succeeded for `checkout.session.completed` (or equivalent path setting `orderIdToScheduleFulfillment`)
3. `orderIdToScheduleFulfillment` truthy
4. Flag enabled

**Side effects on path (even though hook is diagnostics-only):**

- Prior DB writes in webhook transaction (`applyPhase1CheckoutSessionCompleted`, audit, etc.)
- `scheduleFulfillmentProcessing(orderId, …)` **immediately after** hook (unless `PHASE1_WEBHOOK_SKIP_FULFILLMENT_DISPATCH`)
- Fee capture scheduling, ops metrics, rolling alerts

**L-83 constraint check:**

| Constraint | Met without forbidden action? |
|------------|------------------------------|
| Non-replay | **NO** — needs new or replayed signed event |
| No payment/checkout creation | **NO** — path tied to paid checkout session completion |
| No DB mutation | **NO** — transaction precedes hook |
| No fulfillment dispatch | **NO** — `scheduleFulfillmentProcessing` follows hook by design |
| Diagnostic-only HTTP route | **NO** |

---

## 5. Hook call site B — P2002 replay recovery (~line 559)

**Preconditions:**

1. Signature-verified event
2. `checkout.session.completed`
3. P2002 duplicate on `StripeWebhookEvent`
4. Existing checkout row; may run `applyPhase1CheckoutSessionCompleted` in transaction
5. Then hook, then `scheduleFulfillmentProcessing`

**L-83 constraint check:** Worse than site A — explicitly **replay/duplicate** oriented. **Forbidden.**

---

## 6. Candidate paths evaluated and rejected

| Candidate | Staging log? | Non-replay safe? | Verdict |
|-----------|--------------|------------------|---------|
| `npm run shadow-safety-gate` | No webhook event | Local only | **REJECT** — wrong surface |
| Unit tests with `envConfig` override | Mock log only | Local only | **REJECT** — not staging proof |
| `peekShadowSafetyGateAtBoundary` | No | N/A on live routes | **REJECT** — returns null without shadow mode |
| `POST /webhooks/stripe` invalid signature | No hook | No DB on 400 | **REJECT** — no diagnostic line |
| `POST /webhooks/stripe` valid signed event | Possible | Requires Stripe + DB + fulfillment path | **REJECT** — violates L-83 hard constraints |
| Dedicated staging diagnostic/probe route | — | — | **NOT FOUND** in codebase |

**Ripgrep** for synthetic/diagnostic webhook probes under `server/src`, `server/scripts`, `server/tools`: no route calls `maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary` outside Stripe webhook handler.

---

## 7. Sanitized envelope behavior (if hook were reached)

When reached, hook logs only:

- `event: 'shadow_safety_gate_webhook_diagnostic'`
- `envelope: serializeSanitizedEnvelopeForLog(...)` — bounded fields; `wouldScheduleFulfillment: false`

This satisfies **log shape** requirements but does **not** make the **trigger path** safe.

---

## 8. Discovery verdict

**CORE10-L83-VERDICT-001:** `L83_BLOCKED_SAFE_TRIGGER_PATH_MISSING`

No existing code path can produce one staging log line at the webhook post-commit boundary under L-83 constraints (non-replay, no payment, no provider, no DB mutation, no fulfillment dispatch).

---

## 9. Proposed follow-on (NOT executed — requires separate approval)

**L-83A — Code-only staging shadow diagnostics probe route (design gate)**

A future approval-gated step could add a **staging-only**, **feature-flagged**, **read-only/diagnostic-only** HTTP probe that:

- Is disabled on production project / production env
- Calls envelope builder in-process without Stripe signature, DB, provider, or fulfillment
- Emits exactly one sanitized log line
- Requires explicit env/deploy approval and separate L-step

**L-83 does not implement L-83A.**

---

## 10. Approval #2 status

**NOT REQUESTED.** Safe trigger path not proven. Staging HTTP/log capture must not proceed under current codebase.

**Required phrase for any future staging action (only after L-83A or proven path):**

`APPROVE L-83 STAGING SAFE TRIGGER AND REDACTED LOG CAPTURE ONLY`

---

*End.*
