# CORE-01 Data Package Provider Readiness Gap Report

**Date:** 2026-05-28
**Product:** Data packages / data bundles
**Parent:** [CORE-01 readiness review](./ZORA_WALAT_CORE01_PROVIDER_CATALOG_RELOADLY_READINESS_REVIEW_2026_05_28.md)
**Default:** **NOT data-ready**

---

## 1. Data package catalog readiness gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| DP-CAT-01 | UI mock catalog includes `data` product rows — **not backed by server-trusted catalog or Reloadly data SKUs** | **Critical** |
| DP-CAT-02 | `catalogResolver.js` returns `null` for data bundle IDs — intentional Phase 1 disable | **Info** (blocker until enabled) |
| DP-CAT-03 | No Reloadly data-product adapter in `providerRegistry.js` (mock + reloadly airtime only) | **Critical** |

---

## 2. Operator / product mismatch gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| DP-MIS-01 | Mock data SKUs (`mock_data_500mb`, `mock_data_1gb`) in `packageCatalog.js` not connected to live operator products | **High** |
| DP-MIS-02 | Product type enum includes `data_package` and legacy `data_bundle` — normalization boundary untested for checkout | **Medium** |
| DP-MIS-03 | Risk of showing purchasable data UI while checkout rejects — UX inconsistency | **High** |

---

## 3. Package expiry / validity gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| DP-EXP-01 | Mock catalog uses static `detail` strings (e.g. GB labels) — **not provider-authoritative validity/expiry** | **High** |
| DP-EXP-02 | No receipt field schema reviewed for data expiry / activation window | **High** |
| DP-EXP-03 | Support runbook for expired/unactivated data packages **NOT FILED** | **Medium** |

---

## 4. Price / currency gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| DP-PRC-01 | `getDataPackageRetailUsdCents` referenced — checkout path returns disabled error | **Medium** |
| DP-PRC-02 | Wholesale data cost from provider **unknown** — margin floor untested for data | **High** |
| DP-PRC-03 | USD-only checkout assumed — provider may quote local currency | **Medium** |

---

## 5. Fulfillment confirmation gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| DP-FUL-01 | No data-specific fulfillment executor reviewed | **Critical** |
| DP-FUL-02 | Fulfillment eligibility gates on `mobile_topup` — data would be skipped even if paid | **Critical** |
| DP-FUL-03 | Provider confirmation payload for data activation **undefined** | **High** |

---

## 6. Provider failure gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| DP-FAIL-01 | Partial data delivery / delayed activation handling **undefined** | **High** |
| DP-FAIL-02 | Fail-closed policy for data SKU unavailable at fulfillment time **undefined** | **High** |
| DP-FAIL-03 | Retry boundaries for data products **not specified** | **Medium** |

---

## 7. Customer receipt gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| DP-RCPT-01 | Order success UI not proven for data-specific fields (volume, validity, operator) | **High** |
| DP-RCPT-02 | Provider reference for data activation **not defined** | **High** |

---

## 8. Support gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| DP-SUP-01 | No data-package-specific support escalation matrix | **Medium** |
| DP-SUP-02 | Dispute path when data not received but provider reports success **undefined** | **High** |

---

## 9. Evidence gaps

| Evidence ID | Required | Status |
|-------------|----------|--------|
| CORE1-EV-DP-01 | Product definition sign-off (data vs airtime bundle) | **PENDING** |
| CORE1-EV-DP-02 | Reloadly (or alternate) data SKU catalog sample | **PENDING** |
| CORE1-EV-DP-03 | Sandbox data fulfillment trace | **PENDING** |
| CORE1-EV-DP-04 | Receipt template with validity terms | **PENDING** |

---

## 10. No data-ready claim

| Claim | Allowed? |
|-------|----------|
| Data-ready | **NO** |
| Data catalog provider-verified | **NO** |
| Data checkout enabled | **NO** (explicitly disabled Phase 1) |
| Data pilot | **NO-GO** |

---

*CORE-01 data package gap report — product disabled; no readiness claim*
