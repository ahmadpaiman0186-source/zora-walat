# XCH-06 Fake Provider Adapter Boundary

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO EXTERNAL API CALLS**

**Related:** [XCH-02 contracts](./ZORA_WALAT_XCH02_PROVIDER_NEUTRAL_INTERFACE_CONTRACTS_2026_05_28.md)

---

## 1. Fake FX provider boundary

| Method | Returns |
|--------|---------|
| `getRate(corridor, amount)` | Fixture rate from catalog |
| `lockRate(quoteId)` | Canned lock token |
| Network | **NONE** — in-process stub only |

Adapter ID: `fake-fx-v1-stub`.

---

## 2. Fake payout provider boundary

| Method | Returns |
|--------|---------|
| `submitPayout(request)` | `{ status: 'simulated_accepted', ref: 'sim-pay-...' }` |
| `getPayoutStatus(ref)` | Configurable fixture state |
| Network | **NONE** |

No funds leave any account.

---

## 3. Fake KYC/KYB provider boundary

| Method | Returns |
|--------|---------|
| `verifyIdentity(documents)` | `clear` \| `review_required` \| `rejected` (fixture) |
| `verifyBusiness(entity)` | Same enum |
| PII | Use **synthetic test personas only** — no real documents |

---

## 4. Fake AML/sanctions provider boundary

| Method | Returns |
|--------|---------|
| `screen(name, dob, jurisdiction)` | `clear` \| `potential_match` \| `confirmed_match` (fixture) |
| List version | `fake-list-v1` |

No connection to OFAC, UN, or commercial watchlist APIs.

---

## 5. Fake provider event model

| Event | Source |
|-------|--------|
| `provider.payout.completed` | Sandbox harness timer |
| `provider.payout.failed` | Scenario injection |
| `provider.fx.rate_updated` | Manual fixture refresh |

Events are **synthetic** — not webhooks from real providers.

---

## 6. Provider failure simulation

| Failure | Stub behavior |
|---------|---------------|
| Timeout | Delay + `unavailable` |
| Rate limit | `429` simulated in-process |
| Degraded | Partial response + retry hint |

Aligns with [XCH-02 failover model](./ZORA_WALAT_XCH02_PROVIDER_FAILURE_AND_FAILOVER_MODEL_2026_05_28.md) — fail-closed in sim.

---

## 7. External API boundary

| Rule | Status |
|------|--------|
| HTTP to real FX provider | **FORBIDDEN** |
| HTTP to real payout provider | **FORBIDDEN** |
| HTTP to real KYC/AML provider | **FORBIDDEN** |
| Production API keys in sandbox | **FORBIDDEN** |

---

## 8. Prohibited real providers

Until explicit gate approval, **all** commercial remittance/FX/KYC/AML providers are **prohibited** in XCH-06 sandbox scope.

Approved list (future): empty — recorded in [decision template](./ZORA_WALAT_XCH06_DECISION_RECORD_TEMPLATE_2026_05_28.md).

---

*XCH-06 fake providers — stubs only; no external calls*
