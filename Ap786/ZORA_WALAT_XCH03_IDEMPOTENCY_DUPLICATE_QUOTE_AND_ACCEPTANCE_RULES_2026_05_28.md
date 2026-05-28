# XCH-03 Idempotency, Duplicate Quote, And Acceptance Rules

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

---

## 1. Quote request idempotency

| Key | Scope | TTL | Behavior |
|-----|-------|-----|----------|
| `Idempotency-Key` (header) | `POST /quotes` (future) | 24h | Same key → same `quoteId` + identical breakdown |

---

## 2. Quote acceptance idempotency

| Key | Scope | Behavior |
|-----|-------|----------|
| `acceptanceIdempotencyKey` | `POST /quotes/{id}/accept` | Same key → same acceptance record; no double fund |

---

## 3. Duplicate acceptance prevention

| Check | Rule |
|-------|------|
| Quote state | Only `quote_shown` may accept |
| Expiry | Reject if expired |
| Prior acceptance | **REJECT** second accept for same `quoteId` |
| Transaction link | One funding transaction per accepted quote |

---

## 4. Stale quote rejection

| Condition | HTTP / domain |
|-----------|---------------|
| Expired | `409` / `QUOTE_EXPIRED` |
| Superseded | `409` / `QUOTE_SUPERSEDED` |
| Policy version changed | `409` / `QUOTE_STALE_POLICY` |

---

## 5. Replay protection

| Vector | Mitigation |
|--------|------------|
| Replay accept request | Idempotency + state machine |
| Replay fund capture | Separate funding idempotency key |
| Out-of-order webhooks | Normalized event dedupe ([XCH-02 recon](./ZORA_WALAT_XCH02_RECONCILIATION_AND_AUDIT_CONTRACT_2026_05_28.md)) |

---

## 6. User retry behavior

| User action | System behavior |
|-------------|-----------------|
| Retry same idempotency key | Return cached quote |
| Retry new key after expiry | New quote |
| Double-tap accept | Second request idempotent — single effect |

---

## 7. Zero duplicate transaction boundary

| Layer | Invariant |
|-------|-----------|
| Quote | One active accepted quote per intended send intent |
| Funding | One debit per `quoteId` |
| Payout | One payout instruction per funded transaction |

Duplicate → **hold + ops case**; never double payout.

---

*XCH-03 idempotency rules — spec only*
