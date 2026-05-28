# CORE-01 Provider Catalog / Reloadly Readiness Review

**Date:** 2026-05-28
**Pack ID:** CORE-01
**Parent gate:** [CORE-00 return to core execution gate](./ZORA_WALAT_CORE00_RETURN_TO_CORE_EXECUTION_GATE_2026_05_28.md)
**Default verdict:** **NO-GO**

---

## 1. Purpose

CORE-01 performs a **read-only repository review** of provider catalog and Reloadly dependency surfaces for core Zora-Walat products — mobile top-up, data packages, and international call boundary — and records readiness gaps, evidence requirements, and safe next steps **without** executing provider calls, catalog sync, purchases, payments, or runtime mutations.

---

## 2. Scope

| In scope | Out of scope |
|----------|--------------|
| Repository file inspection (grep, path listing) | Reloadly / telecom / Stripe / Vercel API calls |
| Ap786 evidence and gap documentation | App, server, workflow, env, deploy changes |
| Mapping checkout → webhook → order → fulfillment dependencies | Test purchases, catalog sync, provider fulfillment |
| Recording env/config **filenames and variable names only** | Reading or printing secret values |
| Aligning with CORE-00 priority matrix | XCH / CARD / AFG-CARD reactivation |

---

## 3. Non-goals

- Implementing provider adapters, catalog sync jobs, or checkout changes
- Claiming provider-ready, top-up-ready, data-ready, call-ready, payment-ready, pilot-ready, production-ready, real-money-ready, or fix-proven status
- Executing `reloadly:*`, `webtopup:*`, or `proof:reloadly*` scripts
- Mutating Stripe, DB, payments, webhooks, wallets, orders, or deploy state

---

## 4. Read-only review boundary

This pack **authorized only**:

- `git grep`, glob search, and reading non-secret source/docs
- Confirming env example files exist by filename
- Safe validations (`git diff --check`, `secrets:scan`)

This pack **did not authorize**:

- Loading `.env*` files for values
- Running provider proof scripts
- Sandbox or live provider HTTP
- Any state mutation

---

## 5. Provider catalog objective

Establish whether the repository contains a **coherent, verifiable path** from:

1. **Catalog presentation** (UI / mock catalog / server catalog routes)
2. **Trusted checkout pricing** (server-side amount resolution)
3. **Paid order confirmation** (Stripe webhook boundary)
4. **Provider fulfillment** (Reloadly or mock adapter)
5. **Terminal order state + user communication**

CORE-01 finds **partial scaffolding** for (1)–(4) on **mobile top-up / airtime** only; **data** and **calling** remain catalog/UI placeholders without active checkout or Reloadly fulfillment paths.

---

## 6. Reloadly / provider dependency boundary

| Layer | Observed in repo | Readiness |
|-------|------------------|-----------|
| Reloadly OAuth + HTTP client | `server/src/services/reloadlyClient.js`, `reloadlyAuthService.js` | Code present; **live readiness NOT PROVEN** |
| Web top-up Reloadly adapter | `reloadlyWebTopupProvider.js` — **AF + airtime only** | Narrow rollout; **NOT catalog-verified in this review** |
| Operator mapping | `reloadlyOperatorMapping.js`, `RELOADLY_OPERATOR_MAP_JSON` env name | Mapping exists; **operator catalog drift NOT PROVEN safe** |
| Circuit breaker / idempotency | `reloadlyProviderCircuitBreaker.js`, `reloadlyIdempotencyRegistry.js`, `reloadlyTopupInFlight.js` | Code present; **production behavior NOT PROVEN** |
| Mock fallback | `mockTopupProvider.js`, `WEBTOPUP_FULFILLMENT_PROVIDER` env name | Dev/test path; **not a production substitute without gate** |
| DT One | `server/src/providers/dtone.placeholder.js` | **Placeholder only — not primary path** |
| Proof scripts (not executed) | `reloadly-sandbox-readiness.mjs`, `webtopup-reloadly-sandbox-verify.mjs`, etc. | Listed in `server/package.json`; **NOT RUN in CORE-01** |

**No provider approval or execution claim is made by this pack.**

---

## 7. Mobile top-up provider readiness summary

| Area | Finding | Status |
|------|---------|--------|
| Product type active at checkout | `isCheckoutActiveProductType` → `mobile_topup` only | **PARTIAL — code locked to Phase 1 airtime** |
| Reloadly fulfillment scope | `RELOADLY_WEBTOPUP_ENABLED_COUNTRY = 'AF'`, product `airtime` | **NARROW — AF airtime only** |
| Operator keys in checkout allowlist | `roshan`, `mtn`, `etisalat`, `afghanWireless` | **Declared — provider catalog match NOT PROVEN** |
| Catalog source | Server `GET /catalog/airtime`; client `topup/catalog/mockCatalog.ts` | **Mock + server SKU path — live Reloadly catalog sync NOT REVIEWED** |
| Sandbox / live proof | Scripts exist; not executed | **EVIDENCE GAP** |

**Verdict:** Top-up path has **engineering scaffolding**; **provider-ready / top-up-ready NOT CLAIMED**.

---

## 8. Data package provider readiness summary

| Area | Finding | Status |
|------|---------|--------|
| Product types | `DATA_PACKAGE`, `data_bundle` in `productTypes.js` | **Reserved — not checkout-active** |
| Catalog resolver | Returns `null` for data bundle IDs | **Explicitly disabled Phase 1** |
| Checkout allowlist | `allowedCheckout.js` rejects data packages | **BLOCKED at checkout** |
| UI catalog | `mockCatalog.ts` includes `data` rows | **Presentation only — not wired to paid fulfillment** |
| Reloadly data products | No dedicated data-package Reloadly adapter found | **GAP** |

**Verdict:** Data packages are **not provider-ready**; **data-ready NOT CLAIMED**.

---

## 9. International call product boundary summary

| Area | Finding | Status |
|------|---------|--------|
| Product types | `calling_credit`, `international_call_weekly`, UI `calling` | **Ambiguous product definition** |
| Catalog | Mock calling bundles in `mockCatalog.ts` | **Mock only** |
| Checkout | Not in `isCheckoutActiveProductType` | **Not purchasable in Phase 1** |
| Provider path | No Reloadly calling/voice adapter; DT One placeholder | **No fulfillment path** |
| UX copy | Marketing mentions "calling" | **Scope wider than executable product** |

**Verdict:** International call is an **unresolved product boundary**; **call-ready NOT CLAIMED**. See [international call boundary review](./ZORA_WALAT_CORE01_INTERNATIONAL_CALL_PRODUCT_BOUNDARY_REVIEW_2026_05_28.md).

---

## 10. Explicit NO-GO default

| Claim | Status |
|-------|--------|
| Provider catalog verified against live Reloadly | **NO** |
| Top-up / data / call provider-ready | **NO** |
| Sandbox provider proof (current session) | **NOT EXECUTED** |
| Controlled pilot | **NO-GO** |
| Production / real-money | **NO-GO** |

---

## 11. Related CORE-01 documents

| Document | Role |
|----------|------|
| [Repository provider surface map](./ZORA_WALAT_CORE01_REPOSITORY_PROVIDER_SURFACE_MAP_2026_05_28.md) | Files inspected |
| [Reloadly dependency matrix](./ZORA_WALAT_CORE01_RELOADLY_AND_PROVIDER_DEPENDENCY_MATRIX_2026_05_28.md) | Capability dependencies |
| [Top-up gap report](./ZORA_WALAT_CORE01_TOPUP_PROVIDER_READINESS_GAP_REPORT_2026_05_28.md) | Top-up gaps |
| [Data package gap report](./ZORA_WALAT_CORE01_DATA_PACKAGE_PROVIDER_READINESS_GAP_REPORT_2026_05_28.md) | Data gaps |
| [International call boundary](./ZORA_WALAT_CORE01_INTERNATIONAL_CALL_PRODUCT_BOUNDARY_REVIEW_2026_05_28.md) | Call product definition |
| [Fail-closed requirements](./ZORA_WALAT_CORE01_FAIL_CLOSED_PROVIDER_RELIABILITY_REQUIREMENTS_2026_05_28.md) | Reliability gate |
| [Checkout/order dependency review](./ZORA_WALAT_CORE01_CHECKOUT_ORDER_PROVIDER_DEPENDENCY_REVIEW_2026_05_28.md) | Money path deps |
| [Evidence requirements](./ZORA_WALAT_CORE01_PROVIDER_READINESS_EVIDENCE_REQUIREMENTS_2026_05_28.md) | Required proof |
| [Risk register](./ZORA_WALAT_CORE01_RISK_REGISTER_2026_05_28.md) | Open risks |
| [Decision record template](./ZORA_WALAT_CORE01_DECISION_RECORD_TEMPLATE_2026_05_28.md) | Approval template |

---

*CORE-01 readiness review — read-only; no provider execution*
