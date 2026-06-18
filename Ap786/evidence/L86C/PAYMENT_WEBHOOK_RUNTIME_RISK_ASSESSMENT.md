# L-86C — Payment / webhook / runtime risk assessment

**Read-only static analysis — no live Stripe calls, no webhook replay, no DB access**

---

## Money-path surfaces touched by PR #5

| Surface | Risk | Current `main` state |
|---------|------|----------------------|
| `stripeWebhook.routes.js` | **HIGH** | Full Express webhook router; dispute + refund handlers; signature verify upstream |
| `phase1StripeChargeIncidents.js` | **HIGH** | In-tx dispute mapping; optional `charges.retrieve` via `orchestrateStripeCall` |
| `stripe.js` | **MEDIUM** | Process singleton; PR may add test-harness guard not present in current `main` |
| `health.routes.js` / readiness | **MEDIUM** | Deploy/liveness signaling; bounded DB probes (serverless-safe) |

## Dispute webhook flow (conceptual)

```text
Stripe POST → signature verify → route dispatch
  → charge.dispute.created
    → applyPhase1DisputeCreated(tx, dispute, eventId, { stripe, log })
      → resolve payment_intent from payload OR charges.retrieve(chargeId)
      → update PaymentCheckout postPaymentIncidentStatus = DISPUTED
```

**Fail-closed concerns if stale PR merged:**

- Duplicate or divergent dispute mapping vs current orchestrator/reliability stack
- Regression vs slim pre-bootstrap webhook path on Vercel
- Stale test assumptions vs current incident map-source constants

## 503 / retrieve hardening (L27 theme)

PR patches tag `retrieve_503` across webhook, incidents, stripe service, and dedicated test `stripeWebhookDisputeRetrieve503.test.js`. Current `main` implements charge lookup with `orchestrateStripeCall` and operational events on lookup failure — **503-specific regression test file not on `main`**.

## Runtime / deploy coupling

| Factor | Assessment |
|--------|------------|
| L-85X Vercel entrypoint | Webhook may hit slim handler vs full Express graph depending on deploy root |
| Staging proof chain | L-85M blocked — no verified readonly DB proof on staging |
| Merge without redeploy proof | **Unsafe** — cannot claim provider/market readiness |

## Secret / credential handling

PR patches: **no live-secret patterns detected**. `stripe.js` changes relate to client configuration/guards (classification only — no raw values recorded).

---

*End.*
