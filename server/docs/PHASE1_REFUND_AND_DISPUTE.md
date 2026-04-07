# Phase 1 refund, chargeback, and dispute truth

## Current product state

**Automated in-app refunds and dispute workflows are not implemented** for Phase 1 `PaymentCheckout` / MOBILE_TOPUP. There is **no** persisted field such as `refundStatus` or `disputeStatus` on `PaymentCheckout` in this phase.

## Operational truth

| Situation | Meaning in Phase 1 |
|-----------|---------------------|
| **No refund** | Normal completed or pending order; no Stripe Refund object has been created for this charge (ops confirms in Stripe Dashboard if needed). |
| **Pending refund** | **Manual** — team initiated or Stripe is processing; not modeled in app DB. Track in Stripe + support notes. |
| **Refunded** | **Manual** — money returned via Stripe (or bank); reconcile Stripe balance and order notes. Canonical order API does **not** yet expose refund state. |
| **Disputed / chargeback** | **Manual** — handle in Stripe Disputes; no first-class dispute lifecycle in DB. |

## Recommendation (smallest safe extension, optional)

If product needs in-app or API visibility before a full refund product:

1. Add nullable enums on `PaymentCheckout` (or a 1:1 side table): `refundDisputeSummary` with values like `NONE | REFUND_PENDING | REFUNDED | DISPUTE_OPEN | DISPUTE_LOST | DISPUTE_WON`, updated by **Stripe webhooks** (`charge.refunded`, `charge.dispute.closed`, etc.) and manual admin tools.
2. Keep financial anomaly codes separate — they describe margin/fee truth, not Stripe dispute outcome.

Until then, **Stripe Dashboard** remains the source of truth for refunds and disputes; the canonical Phase 1 order read model (`GET /api/orders/:id/phase1-truth`) describes **payment, fees, fulfillment, and margin anomalies**, not refund/dispute lifecycle.

## API placeholder (no DB migration in Phase 1)

The canonical DTO includes **`postPaymentIncident`**:

- `recordedInApp: false` — refunds/disputes are not stored in-app yet.
- `supportWorkflow: "stripe_dashboard_and_support_manual"` — explicit manual path.
- `lifecycleExtensionReserved: true` — future nullable columns or webhooks can populate this without breaking clients.

Support investigations should still use **Stripe IDs**, **provider references**, **anomaly codes**, and **lifecycle timestamps** from the same DTO.
