# CORE-01 Reloadly And Provider Dependency Matrix

**Date:** 2026-05-28
**Parent:** [CORE-01 readiness review](./ZORA_WALAT_CORE01_PROVIDER_CATALOG_RELOADLY_READINESS_REVIEW_2026_05_28.md)

---

## 1. Provider dependency categories

| Category | Description | Repo signal | Verified live? |
|----------|-------------|-------------|----------------|
| **Auth** | OAuth client credentials → bearer token | `reloadlyAuthService.js` | **NO** |
| **Catalog** | Operators, products, denominations | `getOperators` in `reloadlyClient.js`; server `/catalog/airtime` | **NO** |
| **Pricing** | Wholesale cost vs retail checkout | `catalogResolver.js`, pricing engine | **PARTIAL (server-side mock/SKU)** |
| **Fulfillment** | POST top-up / data / voucher | `reloadlyWebTopupProvider.js` — airtime only | **NO** |
| **Inquiry** | Confirm transaction status | `reloadlyTransactionInquiry.js` | **NO** |
| **Resilience** | Circuit breaker, retry, in-flight guard | Multiple Reloadly services | **CODE ONLY** |
| **Fallback** | Mock provider when Reloadly unavailable | `mockTopupProvider`, env-gated | **DEV PATH — NOT PROD CLAIM** |

---

## 2. Required capabilities — mobile top-up

| Capability | Required for safe top-up | Repo coverage | Gap |
|------------|-------------------------|---------------|-----|
| Operator catalog for destination country | Know supported operators | Operator map + defaults; `getOperators` API wrapper | Live catalog sync **NOT PROVEN** |
| Amount / denomination validation | Prevent invalid face values | `ALLOWED_CHECKOUT_USD_CENTS`, pricing engine | Provider denomination match **NOT PROVEN** |
| Recipient MSISDN validation | E.164 / national digits | `reloadlyWebTopupFulfillment.js` min length check | Operator-specific rules **UNKNOWN** |
| Idempotent fulfillment | No duplicate top-ups | Registry + in-flight + webhook dedupe | End-to-end proof **PENDING** |
| Timeout handling | Fail closed on slow provider | Circuit breaker + classified errors | Production thresholds **NOT PROVEN** |
| Fulfillment confirmation | Map provider ref → order terminal | Inquiry + outcome registry | Sandbox evidence **NOT FILED in CORE-01** |
| Paid-order gate | No fulfillment without PAID | State machine + eligibility | STRIPE-WH / staging gaps remain open |

---

## 3. Required capabilities — data packages

| Capability | Required | Repo coverage | Gap |
|------------|----------|---------------|-----|
| Data SKU catalog per operator | Product ID, validity, data volume | Mock UI catalog only | **NO provider binding** |
| Package expiry / validity display | User trust + support | Mock `detail` strings | **Not authoritative** |
| Wholesale vs retail pricing | Margin protection | `dataPackagePricing.js` referenced; resolver returns null | **Checkout disabled** |
| Data-specific Reloadly API path | Fulfill data product | Not in `reloadlyWebTopupProvider` capabilities | **MISSING** |
| Receipt with package terms | Support deflection | Order success UI partial | **NOT PROVEN for data** |

---

## 4. Required capabilities — international calling (if applicable)

| Capability | Required | Repo coverage | Gap |
|------------|----------|---------------|-----|
| Product definition | Direct dial vs airtime vs PIN vs minutes bundle | Multiple mock representations | **UNRESOLVED** |
| Regulatory classification | VoIP / telecom resale rules | Not in code review scope | **NOT DOCUMENTED in repo** |
| Provider contract | Voice or voucher issuer | DT One placeholder only | **NO ACTIVE ADAPTER** |
| Checkout + fulfillment | Purchasable SKU | `isCheckoutActiveProductType` excludes calling | **NOT ENABLED** |
| UX truthfulness | Marketing vs executable product | Copy mentions calling | **MISMATCH RISK** |

---

## 5. Catalog availability dependency

| Dependency | Top-up | Data | Calling |
|------------|--------|------|---------|
| Server-trusted catalog | Airtime SKUs + amount ladder | Disabled (`null` resolver) | Disabled |
| Client mock catalog | All three types shown | Mock rows | Mock bundles |
| Reloadly live catalog | Required before prod AF top-up | Required before data launch | Required before any call product |
| Drift detection | Operator map validation code exists | N/A until enabled | N/A until defined |

**Catalog drift between mock UI, server allowlist, and live Reloadly is an OPEN risk.**

---

## 6. Pricing / currency dependency

| Rule | Observation |
|------|-------------|
| Checkout currency | USD only (Phase 1) |
| Client amount trust | Server re-prices; client amounts not trusted when `packageId` set |
| Provider cost basis | Env-tunable bps / SKU wholesale in mock paths |
| FX for non-USD provider quotes | Not in Phase 1 web top-up path reviewed |

---

## 7. Operator / country support dependency

| Dimension | Phase 1 observed lock |
|-----------|----------------------|
| Reloadly web top-up country | **AF only** (`RELOADLY_WEBTOPUP_ENABLED_COUNTRY`) |
| Reloadly web top-up product | **airtime only** |
| Checkout operators | `roshan`, `mtn`, `etisalat`, `afghanWireless` |
| Sender countries | Catalog route for sender countries; profit report lists US/CA/EU/AE/TR |

Expanding country or operator support requires catalog proof + mapping update + gated rollout — **NOT AUTHORIZED by CORE-01**.

---

## 8. Failure mode dependency

| Failure | Expected behavior (CORE-00/CORE-01 policy) | Code hooks observed |
|---------|-------------------------------------------|---------------------|
| Provider timeout | Fail closed; no silent success | Circuit breaker, error classification |
| Provider 4xx/5xx | Classify; retry within bounds | `classifyProviderError.js` |
| Stale operator ID | Reject fulfillment | Operator map validation |
| Duplicate webhook | Idempotent state transition | Webhook + fulfillment idempotency |
| Unpaid order | No fulfillment dispatch | Eligibility gates |
| Provider success / DB fail | Manual review placeholder | Reconciliation engine referenced |

---

## 9. No provider approval / execution claim

| Statement | Status |
|-----------|--------|
| Reloadly sandbox exercised in CORE-01 | **NO** |
| Reloadly production approved | **NO** |
| Operator catalog matches live Reloadly | **NOT PROVEN** |
| Provider dependency matrix satisfied | **NO — gaps documented** |

---

*CORE-01 dependency matrix — planning/evidence only*
