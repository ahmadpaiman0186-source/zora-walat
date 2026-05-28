# XCH-06 Fail-Closed And No-Pay-No-Service Rules

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

---

## 1. No payment / no service invariant

**INV-NPNS-01:** In XCH-06 sandbox scope, **no payment instrument is charged**, **no wallet is debited**, and **no remittance service is delivered** — only simulated state transitions and logs.

Violation attempt → **hard reject** + audit alert (future).

---

## 2. Fail-closed quote behavior

| Condition | Action |
|-----------|--------|
| Missing `simulationMode` | **REJECT** |
| Expired quote | **REJECT** accept |
| Fake rate unavailable | **REJECT** quote |
| Ambiguous corridor | **REJECT** |

No fallback to stale or default live rate.

---

## 3. Fail-closed compliance behavior

| Condition | Action |
|-----------|--------|
| KYC not `clear` (sim) | **HOLD** |
| Sanctions `potential_match` | **HOLD** |
| Sanctions `confirmed_match` | **BLOCK** |
| Compliance stub `unavailable` | **BLOCK** — no bypass |

---

## 4. Fail-closed provider behavior

| Condition | Action |
|-----------|--------|
| Fake provider timeout | Treat as `unavailable` |
| Unknown provider response | **REJECT** |
| Accidental real provider endpoint detected | **ABORT** sim session |

---

## 5. Fail-closed ledger behavior

| Condition | Action |
|-----------|--------|
| Debit/credit imbalance in sim | **HOLD** + log error |
| Duplicate sim transactionId | **REJECT** |
| Attempt DB persist | **FORBIDDEN** |

---

## 6. No auto-retry money movement

| Rule | Status |
|------|--------|
| Auto-retry sim payout on failure | **FORBIDDEN** without operator |
| Auto-retry with new idempotency key | **FORBIDDEN** for settled sim txn |
| Self-healing ledger correction | **FORBIDDEN** |

---

## 7. Operator review requirement

| Trigger | Requirement |
|---------|-------------|
| SIM hold states | Operator fixture override or abort |
| Recon mismatch sim | Document decision in case log |
| Accidental prod credential detected | **STOP** + incident record |

---

*XCH-06 fail-closed rules — simulation scope only*
