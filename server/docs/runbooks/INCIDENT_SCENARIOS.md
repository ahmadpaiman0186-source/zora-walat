# Incident scenarios (skeleton)

## Stuck orders (paid, non-terminal)

1. Confirm Stripe PaymentIntent `succeeded` and webhook `evt_` delivered (Dashboard + `completedByWebhookEventId` on row).
2. Read canonical order `GET /api/orders/:id/phase1-truth` — check `stuckSignals`, `reconciliationHints`, `manualReviewRequired`.
3. Run foundation recon: `GET /api/admin/reconciliation/phase1-fulfillment`.
4. If safe per hints, use **queue replay** only via `POST /api/admin/fulfillment-dlq/replay` with operator reason (never raw provider retry without DB review).

## Double charge / duplicate fulfillment risk

1. Never mark FULFILLED without provider evidence on `FulfillmentAttempt`.
2. If recon shows `ATTEMPT_SUCCEEDED_ORDER_NOT_FULFILLED` pattern — **stop auto replay**; escalate: risk of duplicate send.
3. Stripe refunds/disputes: Phase 1 is manual-first; use Dashboard + `postPaymentIncident` fields.

## Provider outage / unavailable

1. Classify via `failure_intelligence` metrics and logs (`intelligenceClass=unavailable|provider_failure`).
2. Consider feature flag / kill switches (`FULFILLMENT_DISPATCH_KILL_SWITCH` for web top-up scope; Phase 1 queue can remain but worker will fail fast).
3. Customer comms: use `customerVisible` codes — not raw `failureReason`.

## Queue / Redis down

1. API may still serve; fulfillment queue stops. Paid orders may backlog — **enable incident mode**, scale Redis or fail over.
2. After recovery, reconcile paid-idle set before mass replay.
