# Canonical transaction engine — roadmap (non-destructive)

## Goal

One auditable lifecycle for money + telecom:

`PENDING → PAYMENT_INITIATED → PAYMENT_CONFIRMED → PROCESSING → SUCCESS | FAILED | REFUNDED`

## Current state (incremental)

- **Additive projection:** `server/src/domain/canonicalTransactionProjection.js` maps existing `WebTopupOrder` payment + fulfillment fields to canonical phases **without** schema migration.
- **Money paths unchanged:** Fulfillment still respects `evaluateWebTopupFinancialGuardrails` and existing gates; webhook raw-body verification unchanged.

## Phased rollout (recommended)

1. **Emit** `canonicalPhase` in structured logs for web top-up fulfillment (optional flag).
2. **Materialize** read models / reporting views from existing tables.
3. **Introduce** optional `CanonicalTransaction` table (additive FK to existing orders) — dual-write behind feature flag.
4. **Cut over** fulfillment scheduling to read canonical state only when replay tests pass.
5. **Deprecate** duplicate state derivations only after reconciliation parity.

## Explicit non-goals for emergency patches

- Replacing `PaymentCheckout` / `WebTopupOrder` in one release.
- Blind webhook refactors without replay harness.

## References

- Phase-1 fulfillment gate: `server/src/lib/phase1FulfillmentPaymentGate.js`
- Web top-up paid path: `server/src/services/topupOrder/topupOrderService.js`
- Financial guardrails: `server/src/services/topupFulfillment/webtopFinancialGuardrails.js`
