# XCH-02 Reconciliation And Audit Contract

**Date:** 2026-05-28
**Contract version:** `1.0-draft`
**Status:** **SPECIFICATION ONLY**

---

## 1. Provider event normalization

All provider webhooks/files map to:

| Field | Type | Required |
|-------|------|----------|
| `normalizedEventId` | string (UUID) | **YES** |
| `providerId` | string | **YES** |
| `providerEventRef` | string | **YES** |
| `eventType` | enum | **YES** | See §2 |
| `occurredAt` | ISO-8601 UTC | **YES** |
| `payloadHash` | string | **YES** | SHA-256 of canonical payload |
| `rawPayloadRef` | string | NO | Secure vault reference — not in logs |

---

## 2. Event types (normalized)

| Type | Source examples |
|------|-----------------|
| `quote.created` | FX provider |
| `payout.submitted` | Payout partner |
| `payout.delivered` | Payout partner |
| `payout.failed` | Payout partner |
| `settlement.file.received` | Reconciliation |
| `screening.completed` | AML provider |

---

## 3. Ledger reconciliation fields

| Field | Type | Purpose |
|-------|------|---------|
| `ledgerTransactionId` | string | Platform txn |
| `ledgerPostingSetId` | string | Balanced entry group |
| `expectedAmountMinor` | integer | |
| `actualAmountMinor` | integer | From partner |
| `currency` | ISO 4217 | |
| `reconciliationStatus` | enum | `matched` \| `mismatch` \| `pending` |

---

## 4. Settlement reconciliation fields

| Field | Type | Purpose |
|-------|------|---------|
| `settlementBatchId` | string | |
| `partnerId` | string | |
| `settlementDate` | date | |
| `netPositionMinor` | integer | |
| `feeTotalMinor` | integer | |
| `exceptionCount` | integer | |

---

## 5. Mismatch detection

| Mismatch type | Action |
|---------------|--------|
| Amount delta | Open exception case |
| Missing partner event | Hold + investigate |
| Duplicate partner event | Dedupe by `providerEventRef` |
| Currency mismatch | **Hard stop** |

---

## 6. Duplicate event detection

| Key | Rule |
|-----|------|
| `(providerId, providerEventRef)` | Unique |
| `payloadHash` | Alert on duplicate with different ref |

---

## 7. Immutable audit requirements

| Rule | Status |
|------|--------|
| Append-only audit log | **REQUIRED** |
| No silent delete of audit rows | **REQUIRED** |
| Correlation IDs on all money-path events | **REQUIRED** |
| PII redacted in operational logs | **REQUIRED** |

---

## 8. Operator review evidence model

| Evidence ID pattern | Contents |
|---------------------|----------|
| `RECON-EXC-{uuid}` | Mismatch summary, screenshots refs, resolution |
| Resolution states | `open` \| `resolved` \| `escalated` |
| Resolution requires | Analyst ID + timestamp + reason code |

---

*XCH-02 reconciliation contract — spec only*
