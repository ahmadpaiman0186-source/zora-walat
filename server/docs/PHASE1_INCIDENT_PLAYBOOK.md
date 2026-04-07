# Phase 1 incident playbook (ops / support)

Short, concrete steps. Stripe Dashboard remains source of truth for card-network money movement; the app mirrors lifecycle and incidents for routing.

## Conventions

- **Canonical order**: staff API / read model fields on `PaymentCheckout` (see canonical DTO). Key paths: `GET` admin ops order-health, owner `GET /api/orders/:id/phase1-truth` (`financialAnomalySupportLines`, `supportCorrelationChecklist`, `processingTimeoutMsApplied`, `lifecycleSummary` for one-screen triage).
- **IDs to correlate**: `checkoutId` (`PaymentCheckout.id`), `stripePaymentIntentId`, `stripeCheckoutSessionId`, `completedByWebhookEventId`, fulfillment `providerReference`, Stripe `evt_*` / `pi_*` / `ch_*` / `dp_*`.
- **Logs**: filter JSON lines with `"phase1Ops":true`; HTTP requests use `X-Trace-Id`. Search `stripe_webhook`, `stripe_fee_payment_checkout`, `fulfillment`.

---

## Paid but not delivered

**Inspect (canonical / DB)**

- `orderStatus`, `status`, `paidAt`, `fulfillmentStatus` / latest `fulfillmentAttempt.status`, `fulfillmentProviderReference`, `stuckSignals`, `canonicalPhase`, `lifecycleSummary`.

**Correlate**

- `stripePaymentIntentId` ↔ Stripe PaymentIntent.
- `checkoutId` ↔ fulfillment attempts (`orderId`).

**Logs / events**

- `checkout_paid`, `webhook_processed`, `phase1Ops` fulfillment lines; provider telemetry if enabled.

**Manual actions (allowed)**

- Re-queue or complete fulfillment only through approved admin/runbook tools; do not bypass amount or user binding checks. Escalate if `manualReviewRequired` or stuck signals persist past processing timeout.

---

## Duplicate webhook concern

**Inspect**

- `completedByWebhookEventId` (which `checkout.session.completed` won).
- `StripeWebhookEvent` table: unique `id` → replays return 200 without double pay.

**Correlate**

- Multiple `evt_*` for same session in Stripe vs single `completedByWebhookEventId` on row.

**Logs / events**

- `webhook_duplicate_replay` (`phase1Ops`), `webhook_duplicate_ignored`.

**Manual actions (allowed)**

- None required if order is `PAID` once and attempts count is valid. If duplicate **paid** rows appear (unexpected), stop and escalate — do not run ad-hoc SQL.

---

## Missing provider reference

**Inspect**

- `fulfillmentProviderReference`, `latestAttemptProviderReference`, `financialAnomalyCodes` (e.g. `PROVIDER_REFERENCE_MISSING`).

**Correlate**

- Latest attempt row ↔ provider dashboard using `providerReference` once present.

**Logs / events**

- Fulfillment completion logs, provider error classification.

**Manual actions (allowed)**

- Provider-side verification and internal correction per admin order tools only; document in audit/metadata per existing procedures.

---

## Low / negative margin anomaly

**Inspect**

- `financialAnomalyCodes`, `actualNetMarginBp`, `refinedActualNetMarginBp`, `projectedNetMarginBp`, `stripeFeeActualUsdCents`, `providerCostActualUsdCents`.

**Correlate**

- Pricing snapshot on row vs Stripe balance transaction vs provider cost sources.

**Logs / events**

- `stripe_fee_reconciliation`, financial truth recompute logs.

**Manual actions (allowed)**

- Finance-approved adjustments only; do not edit amounts to “hide” anomalies without ticket.

---

## Refunded (post-payment)

**Inspect**

- `postPaymentIncident.status` = `REFUNDED`, `postPaymentIncident.mapSource` (`REFUND_CHARGE_PAYLOAD`), notes timestamp, `lifecycleStatus` / fulfillment state.

**Correlate**

- Stripe `charge.refunded` ↔ `stripePaymentIntentId`.

**Logs / events**

- `charge_refunded_recorded`, order audit `post_payment_incident`.

**Manual actions (allowed)**

- Support workflow per refunds policy; Stripe Dashboard for actual refund/dispute state.

---

## Disputed (chargeback opened)

**Inspect**

- `postPaymentIncident.status` = `DISPUTED`, `postPaymentIncident.mapSource` (`DISPUTE_PAYLOAD_PI` vs `DISPUTE_CHARGE_LOOKUP`), `disputeSupportMapping` on canonical DTO (`direct_from_stripe_dispute_payload` vs `recovered_via_stripe_charge_api` vs `partial_or_unaudited_map`).

**Correlate**

- Stripe Dispute ↔ `payment_intent` ↔ checkout row.

**Logs / events**

- `charge_dispute_mapped`, `charge_dispute_unmapped`, `charge_dispute_charge_lookup_failed`, `dispute_created_recorded`.

**Manual actions (allowed)**

- Respond in Stripe; use internal notes on checkout. If mapping was `partial_or_unaudited_map`, treat as incomplete audit trail until tied to a PI in Stripe and backfilled if required by policy.
