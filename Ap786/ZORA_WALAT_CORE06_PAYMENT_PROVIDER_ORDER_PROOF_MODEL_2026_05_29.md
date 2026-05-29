# CORE-06 Payment / Provider / Order Proof Model

**Date:** 2026-05-29

---

## Proof bundle (`NoPayNoServiceProofBundle`)

| Section | Fields | Purpose |
|---------|--------|---------|
| **payment** | `stripePaid`, `paymentIntentConfirmed`, `checkoutSessionPaid`, `webhookPaymentReceived`, `paymentFailed`, `orderStatus` | Payment evidence |
| **provider** | `hasSuccessProof`, `providerReference`, `providerExecuted`, `ambiguous`, `timeout`, `lastAttemptStatus` | Provider success evidence |
| **order** | `orderStatus`, `serviceDeliveredFlag`, `fulfillmentScheduled` | Delivery claim evidence |
| **audit** | `requiredEvents`, `presentEvents` | Audit trail evidence |
| **idempotency** | `duplicateRisk`, `ambiguousKey`, `idempotencyConflict` | Duplicate-safety evidence |
| **sandbox** | `isSandbox`, `nonMoneyProof`, `proofLabel` | Non-money simulation only |
| **pending** | `staleAgeMs`, `staleThresholdMs` | Stale PROCESSING boundary |

---

## Helpers

| Function | Returns true when |
|----------|-------------------|
| `hasPaymentProof` | Any paid signal and not `paymentFailed` |
| `hasProviderSuccessProof` | Success proof + not ambiguous/timeout |
| `providerIsAmbiguous` | ambiguous, timeout, or UNKNOWN status |
| `auditGap` | Lists missing required audit events |
| `hasIdempotencyRisk` | duplicate or conflict flags |
| `isSandboxNonMoneyProof` | sandbox + nonMoneyProof flags |

---

## Missing evidence

Decisions include `missingEvidence[]` (e.g. `payment_proof`, `provider_success_proof`, `audit:order_status_changed`).

---

*End of proof model.*
