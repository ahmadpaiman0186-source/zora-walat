# CORE-01 Top-Up Provider Readiness Gap Report

**Date:** 2026-05-28
**Product:** Mobile top-up (Phase 1: Afghanistan airtime)
**Parent:** [CORE-01 readiness review](./ZORA_WALAT_CORE01_PROVIDER_CATALOG_RELOADLY_READINESS_REVIEW_2026_05_28.md)
**Default:** **NOT top-up-ready**

---

## 1. Top-up catalog readiness gaps

| Gap ID | Gap | Severity | Evidence |
|--------|-----|----------|----------|
| TU-CAT-01 | Client mock catalog (`topup/catalog/mockCatalog.ts`) may diverge from server `GET /catalog/airtime` and Reloadly live operators | **High** | Repo structure only — **no live catalog compare** |
| TU-CAT-02 | No automated catalog sync job reviewed; operator/product drift detection relies on validation scripts not executed | **High** | Scripts listed, **NOT RUN** |
| TU-CAT-03 | Amount ladder and SKU face values aligned to Phase 1 minimum ($10+) — provider denomination support per operator **not proven** | **Medium** | `PHASE1_PROFIT_REPORT.md` |

---

## 2. Operator availability gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| TU-OP-01 | Four operator keys in checkout allowlist — mapping to Reloadly operator IDs via `RELOADLY_OPERATOR_MAP_JSON` **not verified live** | **High** |
| TU-OP-02 | Reloadly rollout hard-limited to **AF** — expansion requires new gate | **Medium** |
| TU-OP-03 | `reloadlyAfOperatorsProbe.js` exists but **not executed** in this review | **Medium** |

---

## 3. Amount / product validation gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| TU-VAL-01 | Server rejects client-priced checkouts when `packageId` present — good — but provider-side min/max amounts **not proven** | **High** |
| TU-VAL-02 | Amount-only path uses bps-of-face wholesale estimate — may not match Reloadly quoted cost | **Medium** |
| TU-VAL-03 | Non–`mobile_topup` product types blocked at fulfillment — good — but mis-tagged metadata risk remains | **Medium** |

---

## 4. Recipient phone validation gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| TU-PH-01 | Minimum national digit length check in Reloadly payload builder | **Low–Medium** |
| TU-PH-02 | Operator-specific numbering plans / portability **not validated** against provider | **High** |
| TU-PH-03 | Fraud velocity signals exist (`webtopRiskEngine.js`) — production effectiveness **NOT PROVEN** | **Medium** |

---

## 5. Provider timeout gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| TU-TMO-01 | Circuit breaker and timeout env names present — production tuning **NOT PROVEN** | **High** |
| TU-TMO-02 | Stalled fulfillment lifecycle handlers exist — end-to-end SLA evidence **PENDING** | **Medium** |

---

## 6. Provider failure gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| TU-FAIL-01 | Error classification module present — user-facing failure copy consistency **NOT PROVEN** | **Medium** |
| TU-FAIL-02 | Mock fallback when Reloadly unavailable — must not activate in prod without explicit gate | **Critical** |
| TU-FAIL-03 | Failed fulfillment → refund/manual review path — placeholder only per CORE-00 | **High** |

---

## 7. Idempotency gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| TU-IDEM-01 | Reloadly idempotency registry + in-flight guard in code | **Medium** — needs sandbox replay proof |
| TU-IDEM-02 | Webhook duplicate + fulfillment attempt dedupe — staging STR-02/STR-03 gaps remain | **High** |
| TU-IDEM-03 | Custom identifier correlation — unit tests exist; prod correlation **NOT PROVEN** | **Medium** |

---

## 8. Fulfillment confirmation gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| TU-CONF-01 | Transaction inquiry module exists — wired retry before re-post behavior **env-dependent** | **High** |
| TU-CONF-02 | Terminal order state vs provider truth compare (`reloadlyProviderTruthCompare.js`) — live proof **NOT FILED** | **High** |
| TU-CONF-03 | Sandbox dispatch proof scripts exist — **NOT EXECUTED in CORE-01** | **High** |

---

## 9. Evidence gaps

| Evidence ID | Required | Status |
|-------------|----------|--------|
| CORE1-EV-TU-01 | Reloadly sandbox top-up dispatch log (redacted) | **PENDING** |
| CORE1-EV-TU-02 | Operator map validation output | **PENDING** |
| CORE1-EV-TU-03 | Paid → fulfilled correlation (order ID, provider ref) | **PENDING** |
| CORE1-EV-TU-04 | Duplicate webhook / duplicate fulfillment negative test | **PENDING** |
| CORE1-EV-TU-05 | Provider timeout fail-closed capture | **PENDING** |

---

## 10. No top-up-ready claim

| Claim | Allowed? |
|-------|----------|
| Top-up-ready | **NO** |
| Provider-ready for AF airtime | **NO** |
| Sandbox proof complete | **NO** |
| Production top-up | **NO-GO** |

---

*CORE-01 top-up gap report — gaps OPEN; no readiness claim*
