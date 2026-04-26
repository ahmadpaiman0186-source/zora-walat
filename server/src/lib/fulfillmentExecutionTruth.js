/**
 * Phase 1 fulfillment execution — operator contract for how paid orders become provider I/O.
 *
 * Single-execution guarantees:
 * - `@@unique([orderId, attemptNumber])` on `FulfillmentAttempt` — at most one row per attempt number.
 * - `ensureQueuedFulfillmentAttempt` is idempotent (find-first + savepoint + P2002 recovery).
 * - `processFulfillmentForOrder` claims QUEUED → PROCESSING with `updateMany` where status=QUEUED — duplicate workers get count 0.
 *
 * @see fulfillmentProcessingService.js
 */

/**
 * Embedded in `supportCorrelationChecklist.fulfillmentExecutionTruth` — stable schema for DTO + tests.
 */
export function buildFulfillmentExecutionTruthBlock() {
  return {
    schemaVersion: 1,
    primaryLinkage: 'FulfillmentAttempt.orderId → PaymentCheckout.id (FK, Restrict)',
    initialAttempt: {
      attemptNumber: 1,
      createdWhen:
        'Synchronous to successful `checkout.session.completed` tx via `ensureQueuedFulfillmentAttempt`',
      initialStatus: 'QUEUED',
    },
    duplicatePaymentWebhookSafety:
      'Replay does not insert a second attempt #1; `ensureQueuedFulfillmentAttempt` returns existing row',
    workerClaimSemantics:
      'Exactly one worker wins QUEUED→PROCESSING per attempt id; losers observe updateMany count 0 and exit',
    providerTruthVsLocal:
      'Provider outcome normalized in `normalizeFulfillmentProviderResult`; durable summaries on `FulfillmentAttempt.requestSummary` / `responseSummary`; order-level refs on `PaymentCheckout.fulfillmentProviderReference` when delivered',
    inspectionHint:
      'See `reconciliationHints.fulfillmentAttemptSummary` and `reconciliationHints.evidence` for attempt rows + Stripe ids',
    inquiryBeforePost:
      'Reloadly inquiry paths use the same `reloadlyCustomIdentifier` / correlation bundle as POST; see `FulfillmentAttempt.requestSummary` JSON for persisted keys.',
  };
}
