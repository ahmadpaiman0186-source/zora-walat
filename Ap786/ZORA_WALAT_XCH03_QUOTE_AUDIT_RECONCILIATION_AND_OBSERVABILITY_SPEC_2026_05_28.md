# XCH-03 Quote Audit, Reconciliation, And Observability Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

---

## 1. Quote audit fields

| Field | Required | PII |
|-------|----------|-----|
| `quoteId` | **YES** | NO |
| `corridorId` | **YES** | NO |
| `idempotencyKey` | **YES** | NO |
| `state` | **YES** | NO |
| `sendAmountMinor` | **YES** | NO |
| `payoutAmountMinor` | **YES** | NO |
| `createdAt` / `expiresAt` | **YES** | NO |
| `senderId` | **YES** | Token only in logs |

---

## 2. Rate source audit fields

| Field | Required |
|-------|----------|
| `rateSourceId` | **YES** |
| `referenceRate` | **YES** |
| `customerRate` | **YES** |
| `spreadBps` | **YES** |
| `rateTimestamp` | **YES** |

---

## 3. Fee audit fields

| Field | Required |
|-------|----------|
| `feePolicyId` | **YES** |
| `feeLineItems[]` | **YES** |
| `totalFeesMinor` | **YES** |

---

## 4. Tax placeholder audit fields

| Field | Required |
|-------|----------|
| `taxProfileId` | If applicable |
| `taxLineItems[]` | If applicable |
| `taxCalculationStatus` | `not_applicable` \| `placeholder` \| `calculated` (future) |

---

## 5. Quote acceptance evidence

| Evidence | Contents |
|----------|----------|
| `acceptanceRecordId` | UUID |
| `acceptedAt` | Timestamp |
| `quoteSnapshotHash` | Hash of canonical quote JSON |
| `clientChannel` | e.g. web, mobile |

---

## 6. Reconciliation requirements

| Check | Rule |
|-------|------|
| Accepted quote vs funded amount | Must match within tolerance |
| Quote snapshot vs ledger posting | Must match |
| FX provider ref vs rate audit | Must correlate |

Mismatch → `RECON-EXC-*` case.

---

## 7. Observability markers (future)

Proposed structured log marker family: `ZW_QUOTE_ENGINE_OBSERVABILITY`

| Event | Marker suffix |
|-------|---------------|
| Quote requested | `quote_requested` |
| Quote priced | `quote_priced` |
| Quote expired | `quote_expired` |
| Quote accepted | `quote_accepted` |
| Quote rejected | `quote_rejected` |

**Not implemented** in current Zora-Walat product.

---

## 8. Operator review model

| Case | Trigger | Owner |
|------|---------|-------|
| Quote/ledger mismatch | Reconciliation | Ops + finance |
| Stale acceptance attempt | Audit alert | Ops |
| Rate source unavailable spike | Metrics | SRE |

---

*XCH-03 audit spec — markers not deployed*
