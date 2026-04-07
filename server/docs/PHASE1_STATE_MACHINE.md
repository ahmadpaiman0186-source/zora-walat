# Phase 1 authoritative lifecycle (MOBILE_TOPUP)

## Fields

| Field | Model | Role |
|--------|--------|------|
| `orderStatus` | `PaymentCheckout` | Business order lifecycle (pending → paid → processing → terminal). |
| `status` | `PaymentCheckout` | Payment / recharge row (`INITIATED` … `RECHARGE_COMPLETED` / failures). |
| Fulfillment attempts | `FulfillmentAttempt` | Queue / processing / terminal per provider try. |
| `postPaymentIncidentStatus` | `PaymentCheckout` | Refund / dispute / chargeback signals; gates fulfillment. |

`lifecycleSummary` / `canonicalPhase` on the canonical DTO are **derived** for UX and support, not separate persisted states.

## Order status transitions

Source of truth: `server/src/domain/orders/orderLifecycle.js` (`EDGES`, `assertTransition`, `canTransition`).

- `PENDING` → `PAID` | `FAILED` | `CANCELLED`
- `PAID` → `PROCESSING` | `FAILED`
- `PROCESSING` → `FULFILLED` | `FAILED` | `PAID` (recovery / re-queue)

Terminal order statuses (`FULFILLED`, `FAILED`, `CANCELLED`) are immutable.

## Payment row transitions

Source: `validatePaymentCheckoutStatusTransition` / `canPaymentCheckoutStatusTransition` in `server/src/domain/orders/phase1LifecyclePolicy.js`.

Nominal payment path: `INITIATED` → `CHECKOUT_CREATED` → `PAYMENT_PENDING` → `PAYMENT_SUCCEEDED` → `RECHARGE_PENDING` → `RECHARGE_COMPLETED` | `RECHARGE_FAILED`. Early failures jump to `PAYMENT_FAILED` from pre-success states.

**Webhook shortcut:** `checkout.session.completed` may mark `PAYMENT_SUCCEEDED` directly from `INITIATED` or `CHECKOUT_CREATED` when intermediate statuses were not persisted yet (tests and rare races). Those edges are allowed in `canPaymentCheckoutStatusTransition`.

## Denial codes

`LIFECYCLE_DENIAL_CODE` in `phase1LifecyclePolicy.js`:

- `ORDER_TRANSITION_NOT_ALLOWED` — edge not in the graph.
- `ORDER_TERMINAL_IMMUTABLE` — mutation after terminal `orderStatus`.
- `ORDER_STATUS_NOOP` / `PAYMENT_STATUS_NOOP` — reserved for explicit no-op validation results.
- `PAYMENT_STATUS_TRANSITION_NOT_ALLOWED` — illegal `status` change.

## Coherence checks

`detectPhase1LifecycleIncoherence(row)` flags impossible pairs of `orderStatus` and `status` (e.g. `PAID` without `PAYMENT_SUCCEEDED`). Exposed on canonical DTO as `lifecycleCoherenceViolations` and on support traces under `fortress.lifecycleCoherenceViolations`.

## Where transitions are enforced

- Stripe checkout completion: `phase1StripeCheckoutSessionCompleted.js` (`assertTransition` + payment validation).
- Fulfillment claim: `fulfillmentProcessingService.js` (`assertTransition`, payment row validation, `canOrderProceedToFulfillment` including post-payment incidents).
- Webhook cancel path: `stripeWebhook.routes.js` (`assertTransition` to `CANCELLED`).
- Processing recovery: `processingRecoveryService.js` (`PROCESSING` → `PAID`).
