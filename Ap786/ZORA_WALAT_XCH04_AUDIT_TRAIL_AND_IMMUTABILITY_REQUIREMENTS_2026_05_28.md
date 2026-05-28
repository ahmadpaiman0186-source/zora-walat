# XCH-04 Audit Trail And Immutability Requirements

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

---

## 1. Immutable audit record requirements

| Requirement | Rule |
|-------------|------|
| Append-only storage | **REQUIRED** |
| No UPDATE/DELETE on audit rows | **REQUIRED** |
| Cryptographic hash chain (future) | **DESIGN OPTION** — not implemented |
| Tamper detection | Alert on integrity violation |

---

## 2. Event source metadata

| Field | Required |
|-------|----------|
| `eventId` | **YES** |
| `eventType` | **YES** |
| `sourceSystem` | **YES** |
| `occurredAt` | **YES** |
| `ingestedAt` | **YES** |
| `schemaVersion` | **YES** |

---

## 3. Actor / operator metadata

| Field | When |
|-------|------|
| `actorType` | `system` \| `operator` \| `customer` |
| `actorId` | Tokenized — no raw PII in logs |
| `approvalId` | Manual actions |
| `ipRegion` | If available — compliance review |

---

## 4. Provider correlation IDs

| ID | Link |
|----|------|
| `quoteId` | Quote engine |
| `transactionId` | Business transaction |
| `providerPayoutRef` | Payout provider |
| `providerFxRef` | FX provider |
| `idempotencyKey` | All mutating APIs |

---

## 5. Before / after state expectations

State transitions must capture:

- `beforeState` / `afterState`
- `beforeBalanceMinor` / `afterBalanceMinor` (account-level, conceptual)
- `changeReason`

---

## 6. Evidence retention

| Class | Retention (proposed) | Approval |
|-------|----------------------|----------|
| Ledger audit | 7+ years | Legal |
| Recon exceptions | 7+ years | Legal |
| Ops manual actions | 7+ years | Legal |
| Debug traces | 90 days | Engineering |

Retention periods → **legal gate XCH4-G3** before enforcement.

---

## 7. Tamper-evident expectations

| Control | Status |
|---------|--------|
| WORM or append-only DB | **FUTURE DESIGN** |
| Access audit on audit store | **REQUIRED** |
| Separation of duties for audit admin | **REQUIRED** |

---

## 8. Compliance review boundary

| Item | Status |
|------|--------|
| Audit spec defined | **YES** |
| Compliance-approved retention | **NOT OBTAINED** |
| Immutable store deployed | **NO** |

---

*XCH-04 audit immutability — spec only*
