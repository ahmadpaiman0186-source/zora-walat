# Trust-oriented API contract (customer orders)

Backend support for **receipt-like clarity** and **order tracking** without a Flutter redesign. Clients should treat these fields as the stable, user-safe contract.

## List and detail — `GET /api/transactions`, `GET /api/transactions/:id`

- **Auth:** Required (`requireAuth`). Rate limit: `ordersReadLimiter` (IP + user id).
- **List:** Returns `{ orders: [...] }` with `Cache-Control: no-store`.

Each order object is built in `transactionsService.mapUserOrder` and includes:

| Field | Purpose |
|-------|---------|
| `orderId`, `orderReference` | Stable server id (same value today); use for support correlation |
| `orderStatus`, `orderStatusLabel` | Coarse lifecycle |
| `paymentStatus`, `paymentStatusLabel` | Stripe-backed payment row state |
| `fulfillmentStatus`, `fulfillmentStatusLabel` | Latest attempt; label may read “Confirming delivery” when `trackingStageKey === 'verifying'` |
| `trackingStageKey` | Machine stage: `payment_pending`, `paid`, `processing`, `verifying`, `delivered`, `failed`, `cancelled`, etc. |
| `trustStatusKey`, `trustStatusDetail` | Short key + human explanation (“processing”, “delayed”, …) |
| `providerReferenceSuffix` | Safe tail of provider reference for “proof of attempt” UI |
| `recipientMasked` | Privacy-preserving recipient display |
| `paidUsd`, `deliveredValueUsd` | Money clarity where truth snapshot exists |
| `processingFeeUsd`, `processingFeeIsFinal` | Stripe fee estimate vs captured |
| `transparencyFxNote`, `transparencyDeliveryNote` | Static disclosure strings |
| `dataSource` | `"account"` — row is tied to authenticated user |
| `updatedAt`, `updatedAtIso` | Staleness / polling hints |

## Not exposed here (by design)

- Full Stripe PaymentIntent id, raw webhook payloads, or internal reconciliation codes — use admin/ops paths and logs.
- **Wallet ledger** lines — wallet balance is `GET /api/wallet` (and related); ledger audit is server-side.

## Related docs

- Canonical order shape (richer than transactions DTO): `PHASE1_CANONICAL_ORDER_DTO.schema.md`
- State machine: `PHASE1_STATE_MACHINE.md`
- End-to-end purchase flow: `E2E_PHASE1_CHECKOUT_TO_DELIVERY.md`
