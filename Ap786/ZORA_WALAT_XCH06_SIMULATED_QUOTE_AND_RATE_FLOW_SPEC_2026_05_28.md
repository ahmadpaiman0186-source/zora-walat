# XCH-06 Simulated Quote And Rate Flow Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO LIVE FX**

**Related:** [XCH-03 quote spec](./ZORA_WALAT_XCH03_QUOTE_RATE_FEE_TAX_ENGINE_EXECUTION_SPEC_2026_05_28.md) · [XCH-03 rate policy](./ZORA_WALAT_XCH03_RATE_SOURCE_AND_SPREAD_POLICY_2026_05_28.md)

---

## 1. Simulated quote request

| Field | Source |
|-------|--------|
| `corridorId` | Fixture catalog |
| `sendAmountMinor` | User input (sandbox UI) |
| `idempotencyKey` | Client-generated UUID |
| `simulationMode` | **Must be `true`** |

Requests without `simulationMode: true` → **REJECT** in future sandbox (fail-closed).

---

## 2. Simulated quote response

| Field | Value |
|-------|-------|
| `quoteId` | `sim-quote-{uuid}` |
| `state` | `quote_priced` |
| `expiresAt` | Now + configurable TTL (e.g. 60s) |
| `simulationLabel` | `"SIMULATION / NON-MONEY"` |
| `disclaimer` | Not a binding offer; no execution |

---

## 3. Fake rate source

| Field | Simulation |
|-------|------------|
| `rateSourceId` | `fake-mid-market-001` |
| `referenceRate` | Fixture table (e.g. 1 USD = 70.00 AFN) |
| `customerRate` | Reference − fake spread |
| `rateTimestamp` | Server now |

**No external rate API.**

---

## 4. Fake spread

| Field | Example |
|-------|---------|
| `spreadBps` | 50 (fixture) |
| Disclosure | Included in response breakdown |

---

## 5. Fake fee

| Line | Example |
|------|---------|
| `app_fee_fixed` | 199 minor units |
| `corridor_fee` | 0 |
| `partner_fee` | 0 (simulated pass-through) |

Fees are **display only** — no collection.

---

## 6. Quote expiry simulation

| Scenario | Behavior |
|----------|----------|
| TTL elapsed | Return `QUOTE_EXPIRED` on accept |
| Manual clock skew test | Fixture override in sandbox harness |

---

## 7. Stale quote simulation

| Trigger | Response |
|---------|----------|
| Accept after expiry | `409 QUOTE_EXPIRED` |
| Re-price request | New `quoteId`; prior → `quote_re_priced` |

---

## 8. Live FX boundary

| Claim | Status |
|-------|--------|
| Simulated quote flow specified | **YES** |
| Live FX | **NOT ENABLED** |
| Real-money quote | **NO-GO** |

---

*XCH-06 simulated quote flow — no live FX*
