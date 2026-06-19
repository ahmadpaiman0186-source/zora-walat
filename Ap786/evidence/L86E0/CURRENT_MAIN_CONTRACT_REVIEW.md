# L-86E-0 — Current main contract review

**Source:** tracked `main` @ `1535fd0` — read-only static analysis

---

## Dispute webhook flow on `main`

```text
POST /webhooks/stripe (signature verified)
  → prisma.$transaction:
       stripeWebhookEvent.create(event.id)     // idempotency key
       writeOrderAudit(stripe_webhook_received)
       charge.dispute.created:
         applyPhase1DisputeCreated(tx, dispute, eventId, { stripe, log })
  → on success: HTTP 200 { received: true }
```

## `applyPhase1DisputeCreated` — lookup failure path

| Step | Behavior |
|------|----------|
| PI on dispute payload | Use directly |
| No PI, has charge id | Single `orchestrateStripeCall` → `stripe.charges.retrieve` (**maxAttempts: 1**, in-tx) |
| Retrieve throws | **Catch** — warn log + `charge_dispute_charge_lookup_failed` event — **no throw** |
| PI still unresolved | `charge_dispute_unmapped` event — return `{ updated: 0, reason: 'no_payment_intent_on_dispute' }` |
| PI resolved, row found | Update `postPaymentIncidentStatus = DISPUTED` + audit |

**Key:** Lookup failure does **not** abort the transaction.

## HTTP ack semantics on `main` (`stripeWebhook.routes.js`)

| Outcome | HTTP response |
|---------|---------------|
| Transaction **succeeds** (including dispute unmapped / `updated: 0`) | **200** `{ received: true }` |
| Transaction **throws** (non-P2002) | **200** `{ received: true }` — `express_error_ack` path |
| Duplicate event (P2002) | **200** `{ received: true }` — idempotent replay handling |

**Observed de facto contract:** Stripe receives **200 ack** even when dispute mapping fails or transaction errors (except pre-handler failures like missing signing secret → 503 elsewhere in stack).

## Idempotency / audit trail

| Mechanism | On lookup-failure dispute |
|-----------|---------------------------|
| `StripeWebhookEvent` row | **Created** — event consumed in DB |
| Stripe retry after 200 ack | Duplicate blocked via event id / shadow ack |
| Stripe retry after 503 (Option A) | Event **not** persisted — retries re-attempt lookup |
| Support audit | Operational events + webhook audit; **no** `postPaymentIncident` row if unmapped |

## Slim vs Express entry (L-85X)

Staging deploy root may route webhooks through slim handler vs full Express graph. **Contract decision must not assume staging behavior is proven** until L-85M + route exposure gates pass.

---

*End.*
