# XCH-02 FX Provider Contract

**Date:** 2026-05-28
**Contract version:** `1.0-draft`
**Status:** **SPECIFICATION ONLY / NO LIVE FX EXECUTION**

**Related:** [XCH-01 quote spec](./ZORA_WALAT_XCH01_QUOTE_RATE_FEE_TAX_ENGINE_SPEC_2026_05_28.md)

---

## 1. Quote request shape

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `requestId` | string (UUID) | **YES** | Correlation |
| `idempotencyKey` | string | **YES** | Dedupe key |
| `corridorId` | string | **YES** | e.g. `US-AF` |
| `sourceCurrency` | ISO 4217 | **YES** | e.g. `USD` |
| `destinationCurrency` | ISO 4217 | **YES** | e.g. `AFN` |
| `sendAmountMinor` | integer | **YES** | Minor units |
| `requestedAt` | ISO-8601 UTC | **YES** | Timestamp |

---

## 2. Quote response shape

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `quoteId` | string (UUID) | **YES** | Platform quote ID |
| `providerQuoteRef` | string | NO | Opaque provider reference |
| `referenceRate` | decimal string | **YES** | High-precision string |
| `customerRate` | decimal string | **YES** | Rate applied to customer |
| `spreadBps` | integer | **YES** | Basis points disclosed |
| `payoutAmountMinor` | integer | **YES** | Expected receive amount |
| `expiresAt` | ISO-8601 UTC | **YES** | Quote expiry |
| `status` | enum | **YES** | `quoted` \| `unavailable` \| `error` |

---

## 3. Rate source metadata

| Field | Type | Required |
|-------|------|----------|
| `rateSourceId` | string | **YES** |
| `rateSourceType` | enum | **YES** | `mid_market` \| `partner` \| `internal_policy` |
| `rateTimestamp` | ISO-8601 UTC | **YES** |
| `rateValiditySeconds` | integer | **YES** |

---

## 4. Quote expiry

| Rule | Behavior |
|------|----------|
| Expired quote | `status` → reject funding; require new quote |
| Clock skew | Server authoritative `expiresAt` |
| Extension | **Not allowed** without new request |

---

## 5. Spread disclosure fields

Must be present in customer-facing breakdown (future UI):

- `referenceRate`
- `customerRate`
- `spreadBps` or equivalent currency amount
- `rateTimestamp`

---

## 6. Rounding policy

| Stage | Policy |
|-------|--------|
| Internal calc | Integer minor units |
| Display | Corridor-specific — legal review |
| Residue | Treasury adjustment account — future gate |

---

## 7. Idempotency requirements

| Key | Scope | Behavior |
|-----|-------|----------|
| `idempotencyKey` | Quote request | Same key → same `quoteId` within TTL |
| TTL | 24h proposed | Configurable per corridor |

---

## 8. Provider failure handling

| Failure | Contract response | Domain action |
|---------|-------------------|---------------|
| Timeout | `status: error`, `errorCode: PROVIDER_TIMEOUT` | Fail closed — no quote |
| Rate unavailable | `status: unavailable` | Block send |
| Invalid pair | `errorCode: INVALID_CORRIDOR` | Block send |
| Partial response | **Reject** — treat as error | Fail closed |

---

## 9. Execution boundary

| Claim | Status |
|-------|--------|
| Contract specified | **YES** |
| Live FX execution | **NOT ENABLED** |
| Production-ready | **NOT CLAIMED** |

---

*XCH-02 FX contract — no live execution*
