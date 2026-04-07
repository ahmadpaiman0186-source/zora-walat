# Phase 1 idempotency contract (Transaction Fortress)

**Principle:** any action may be retried; no intentional double application of the same side effect.

Structured noop stream: `emitFortressIdempotencyNoop(reasonCode, fields)` → `fortress_idempotency_noop` operational events (`server/src/lib/transactionFortressIdempotency.js`).

## Side-effecting actions and identity

| Action | Authoritative identity | Safe repeat behaviour |
|--------|------------------------|------------------------|
| Mark paid (webhook) | Stripe `evt_*` stored on row (`completedByWebhookEventId`) + `updateMany` guard on `orderStatus`/`status` | Second completion: early return or `CHECKOUT_SESSION_REPLAY_AFTER_PAID` noop. |
| Enqueue fulfillment attempt #1 | Unique `(orderId, attemptNumber)` + existence check in `ensureQueuedFulfillmentAttempt` | `FULFILLMENT_ATTEMPT_ONE_ALREADY_PRESENT`. |
| Claim queued attempt | `updateMany` on `fulfillmentAttempt` with `QUEUED` | Loser gets count 0; order row unchanged. |
| Order PAID → PROCESSING | `updateMany` on `PaymentCheckout` with `orderStatus: PAID` | Loser rolls attempt back to `QUEUED`. |
| Payment row → `RECHARGE_PENDING` | Same payment checkout row | Blocked if `validatePaymentCheckoutStatusTransition` fails (`PAYMENT_ROW_TRANSITION_DENIED_AT_CLAIM`). |
| Provider send | Tied to a single `fulfillmentAttempt` in `PROCESSING` | Terminal attempt + order updates use constrained `updateMany`; duplicate workers must not pass claim. |
| Persist Stripe fee actual | PaymentIntent id + internal reconciliation; service uses idempotent-ish Stripe reads | Failures classified + retry directive in fee service logs. |
| Refund / dispute incident | `postPaymentIncidentStatus` + timestamps; gate reads same row | `FULFILLMENT_GATE_BLOCKS_CLAIM` if fulfillment would proceed after incident. |

## Retry narration

Support / ops should correlate:

- Fortress noop reasons (above codes).
- `lifecycleCoherenceViolations` on canonical / staff DTOs.
- `transaction_failure_class` + `transactionRetryDirective` on webhook ops payloads and provider I/O logs (`meta` on delivery logs).

This document is referenced from staff support traces (`fortress.idempotencyContractDoc`).
