# Phase 1 canonical order DTO — schema contract

**Endpoint:** `GET /api/orders/:id/phase1-truth` (authenticated; owner-only)  
**Response:** `{ phase1Order: <CanonicalPhase1OrderDto> }`  
**Source:** `server/src/services/canonicalPhase1OrderService.js` + `canonicalPhase1Lifecycle.js`

## Stability

- **`schemaVersion`**: integer; bump when breaking JSON shape (support tools should branch on this).
- **Null policy:** financial and provider fields stay `null` when unknown — never coerced to `0`.
- **Commercial scope:** `commercialOrderType` is always `MOBILE_TOPUP` for this endpoint.

## Core identity & selection

| Field | Type | Notes |
|-------|------|--------|
| `checkoutId` | string | PaymentCheckout id |
| `commercialOrderType` | `"MOBILE_TOPUP"` | Fixed for Phase 1 app path |
| `senderCountryCode` | string \| null | ISO region (US, CA, …) |
| `recipientPhone` | string \| null | National digits as stored (`recipientNational`) |
| `operatorKey` / `operatorName` | string \| null | Name only when mapped; else null |
| `productType` | string | e.g. `mobile_topup` |
| `packageId` | string \| null | Catalog id when used |
| `currency` | string | USD for Phase 1 |
| `idempotencyKey` | string \| null | Checkout idempotency |

## Money & Stripe (support references)

| Field | Type |
|-------|------|
| `checkoutChargeUsd` | number \| null |
| `stripePaymentIntentId` / `stripeCheckoutSessionId` / `stripeCustomerId` | string \| null |
| `completedByStripeWebhookEventId` | string \| null |
| `stripeFeeEstimatedUsdCents` / `stripeFeeActualUsdCents` | number \| null |
| `stripeBalanceTransactionAmountCents` | number \| null |
| `providerCostUsdCents` / `providerCostActualUsdCents` | number \| null |
| `providerCostTruthSource` | string \| null |
| `projectedNetMarginBp` / `actualNetMarginBp` / `refinedActualNetMarginBp` | number \| null |
| `expectedMarginUsd` | number \| null | From `projectedNetMarginBp` × charged amount (null if projection unknown) |
| `actualMarginUsd` | number \| null | Refined profit USD only when `stripeFeeActualUsdCents` is known |
| `marginDeltaUsd` | number \| null | `actual − expected` when both sides known |
| `reconciliationStatus` | `"MATCH"` \| `"MISMATCH"` \| `"UNKNOWN"` | `MISMATCH` if any `financialAnomalyCodes`; `UNKNOWN` until delivered terminal + actual Stripe fee; else `MATCH` |
| `fulfillmentPaymentGate` | object | Server-derived snapshot from `phase1FulfillmentPaymentGate.js`: `workerMayClaimPaidQueued`, `clientKickMayInvoke`, `activeDenialCode`, `activeDenialDetail` — **not** client input |

| `financialAnomalyCodes` | string[] |
| `financialAnomalySupportLines` | string[] | Ticket-ready explanation per flag (parallel to codes) |
| `processingTimeoutMsApplied` | number | Threshold used when computing `stuckSignals` |
| `supportCorrelationChecklist` | object | API paths + Stripe id handles for investigations (see `phase1SupportHints.js`) |
| `financialTruthComputedAt` | ISO string \| null |

## Fulfillment

| Field | Type |
|-------|------|
| `fulfillmentStatus` | string \| null | Latest attempt status |
| `latestAttemptNumber` | number \| null |
| `fulfillmentAttemptCount` | number |
| `fulfillmentProviderReference` / `fulfillmentProviderKey` | Checkout denormalized fields |
| `latestAttemptProviderReference` / `latestAttemptProviderKey` | From latest attempt row |

## Lifecycle (single narrative)

| Field | Type |
|-------|------|
| `paymentStatus` | PaymentCheckout `status` |
| `lifecycleStatus` | `orderStatus` |
| `canonicalPhase` | Enum string — see `PHASE1_CANONICAL_PHASE` in `canonicalPhase1Lifecycle.js` |
| `lifecycleSummary` | `{ headline, detail, supportNarrative }` — human-readable “what happened” |
| `stuckSignals` | string[] — operational risk flags (timeouts, missing ref, retries) |
| `manualReviewRequired` | boolean |
| `manualReviewReason` / `manualReviewClassification` | string \| null |

## Post-payment incidents (refund / dispute)

Persisted on `PaymentCheckout` (`postPaymentIncidentStatus`, notes, updatedAt). Stripe Dashboard remains authoritative for money movement; app fields are for **support / ops correlation** (manual updates or future automation).

| Field | Type |
|-------|------|
| `postPaymentIncident.status` | string — see `POST_PAYMENT_INCIDENT_STATUS` (`NONE`, `REFUND_REQUESTED_MANUAL`, `REFUNDED`, `DISPUTED`, `CHARGEBACK_LOST`, `CHARGEBACK_WON`) |
| `postPaymentIncident.recordedInApp` | boolean — true when status ≠ `NONE` |
| `postPaymentIncident.notes` | string \| null |
| `postPaymentIncident.updatedAt` | ISO string \| null |
| `postPaymentIncident.supportWorkflow` | string — manual-first classification hint |
| `postPaymentIncident.lifecycleExtensionReserved` | boolean — forward compatibility |
| `postPaymentIncident.mapSource` | string \| null | How refund/dispute was tied to checkout (`REFUND_*`, `DISPUTE_*` constants) |
| `postPaymentIncident.incidentMappingAuditComplete` | boolean | False when dispute/refund status exists without `mapSource` (legacy row) |
| `postPaymentIncident.disputeSupportMapping` | string | `not_applicable` \| `direct_from_stripe_dispute_payload` \| `recovered_via_stripe_charge_api` \| `partial_or_unaudited_map` |

## Timestamps (ISO 8601)

`paidAt`, `failedAt`, `cancelledAt`, `createdAt`, `updatedAt` — each `null` when not applicable.
