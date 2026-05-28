# XCH-03 Rate Source And Spread Policy

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO LIVE FX**

**Related:** [XCH-02 FX contract](./ZORA_WALAT_XCH02_FX_PROVIDER_CONTRACT_2026_05_28.md) · [XCH-01 quote spec](./ZORA_WALAT_XCH01_QUOTE_RATE_FEE_TAX_ENGINE_SPEC_2026_05_28.md)

---

## 1. Provider-neutral rate source metadata

Every priced quote must record:

| Field | Required |
|-------|----------|
| `rateSourceId` | **YES** |
| `rateSourceType` | **YES** |
| `rateTimestamp` | **YES** |
| `providerRateRef` | NO |
| `rateValiditySeconds` | **YES** |

---

## 2. Mid-market / reference rate abstraction

| Concept | Definition |
|---------|------------|
| `referenceRate` | External or licensed mid-market equivalent |
| `customerRate` | Rate applied to conversion |
| Spread | `referenceRate` vs `customerRate` — always disclosed |

---

## 3. Spread policy

| Rule | Status |
|------|--------|
| Spread cap per corridor | Config table — compliance approved |
| Spread change during lock | **Invalidate** quote |
| Negative spread (loss leader) | Requires explicit gate — default **BLOCKED** |

---

## 4. Disclosure requirements

Customer-facing breakdown must include:

- Reference rate (or source label)
- Customer rate
- Spread in bps or currency amount
- Rate timestamp

---

## 5. Provider degradation handling

| Provider state | Rate engine behavior |
|----------------|---------------------|
| `healthy` | Normal pricing |
| `degraded` | May return `unavailable` |
| `unavailable` | **No quote** — fail closed |

---

## 6. Rate refresh cadence

| Mode | Cadence | Use |
|------|---------|-----|
| On-demand | Per quote request | Default |
| Background refresh | Optional cache — TTL bounded | Sandbox only until approved |
| Stale cache use | **FORBIDDEN** beyond TTL |

---

## 7. Rate lock boundary

| Event | Lock behavior |
|-------|---------------|
| Quote priced | Lock `customerRate` until `expiresAt` |
| Lock expiry | Must re-quote |
| Funding after expiry | **REJECT** |

---

## 8. Live FX boundary

| Claim | Status |
|-------|--------|
| Rate policy specified | **YES** |
| Live FX execution | **NOT ENABLED** |

---

*XCH-03 rate policy — no live FX*
