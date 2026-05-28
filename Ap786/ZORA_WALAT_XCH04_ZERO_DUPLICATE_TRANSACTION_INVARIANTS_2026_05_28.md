# XCH-04 Zero Duplicate Transaction Invariants

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

**Related:** [XCH-03 idempotency](./ZORA_WALAT_XCH03_IDEMPOTENCY_DUPLICATE_QUOTE_AND_ACCEPTANCE_RULES_2026_05_28.md) · [XCH-02 recon contract](./ZORA_WALAT_XCH02_RECONCILIATION_AND_AUDIT_CONTRACT_2026_05_28.md)

---

## 1. Idempotency keys

| Layer | Key scope | TTL | Behavior |
|-------|-----------|-----|----------|
| Quote request | `POST /quotes` | 24h | Same key → same quote |
| Quote acceptance | `POST /quotes/{id}/accept` | 24h | Same key → same acceptance |
| Funding | `POST /fund` (future) | 24h | Same key → same debit |
| Payout request | `POST /payouts` (future) | 24h | Same key → same payout instruction |

---

## 2. Provider event deduplication

| Source | Dedupe key | Rule |
|--------|------------|------|
| FX provider webhook | `providerEventId` | Process once |
| Payout provider webhook | `providerEventId` | Process once |
| Stripe (existing product) | `event.id` | Existing slim path — out of XCH-04 scope |

Duplicate provider event → **ack + no-op** (idempotent handler).

---

## 3. Quote acceptance deduplication

| Check | Rule |
|-------|------|
| One acceptance per `quoteId` | **REQUIRED** |
| Acceptance after expiry | **REJECT** |
| Second accept with new key | **REJECT** — return prior acceptance record |

---

## 4. Payout request deduplication

| Check | Rule |
|-------|------|
| One payout instruction per funded `transactionId` | **REQUIRED** |
| Duplicate payout API call | Return existing payout ref |
| Duplicate provider submission | **HOLD** — ops case |

---

## 5. Webhook / event replay protection

| Vector | Mitigation |
|--------|------------|
| Replay webhook | Idempotency store + processed-event ledger |
| Out-of-order events | State machine guards |
| Late duplicate settlement | Reconciliation mismatch → hold |

---

## 6. Operator retry boundaries

| Action | Allowed | Forbidden |
|--------|---------|-----------|
| Retry with same idempotency key | Return cached result | — |
| Retry with new key on settled txn | — | **FORBIDDEN** |
| Manual re-submit payout | Ops approval + new audit record | Blind double-submit |

---

## 7. Exactly-once business effect requirement

| Effect | Invariant |
|--------|-----------|
| Customer debit | At most once per `transactionId` |
| Payout credit | At most once per `transactionId` |
| Fee recognition | At most once per `transactionId` |

At-least-once delivery with idempotent consumers → **exactly-once business effect**.

---

## 8. No duplicate value movement invariant

**INV-ZD-01:** No corridor, account, or customer may experience net duplicate value movement from the same business intent.

Violation → **immediate hold** + `DUPLICATE-DETECT-*` ops case.

---

*XCH-04 zero-duplicate invariants — spec only*
