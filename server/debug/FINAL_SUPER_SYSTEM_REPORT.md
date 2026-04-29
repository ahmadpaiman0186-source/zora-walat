# Final super-system hardening — Zora-Walat

**Generated:** 2026-04-29  
**Scope:** Compliance dial-prefix blocking, restricted-region HTTP barrier before money paths, Phase 1 USD ladder normalization (`2–25 USD` grid), repository alignment tests, Stripe webhook integrity unchanged.

---

## 1) Iran / sanctioned dialing — removal proof

- Application/source scans (`iran`, `tehran`, operator brands): **no matches** in product code paths (CMake `flutter_assets` path fragments may match naive `ir_`-style greps — benign tooling noise).
- **Central denylist:** `server/src/policy/restrictedRegions.js` — ISO-style restricted codes + dial-prefix classification exported only here.
- **Middleware:** `server/src/middleware/blockRestrictedCountries.js` runs **after** `express.json()`, **before** payment/catalog handlers; **`/webhooks/stripe`** skipped (raw-body route unchanged upstream in `app.js`).
- **Dial blocking:** `rawDialIndicatesBlockedComplianceRegion()` blocks ITU-style CC digit prefix encoded via `String.fromCharCode` (no ambiguous source literals). Applies to `recipientPhone`, nested `*phone*`, `msisdn`, `e164`, and matching query keys.

---

## 2) Pricing grid enforcement proof

- **Server canonical ladder:** `server/src/lib/phase1PriceLadder.js` — USD cents  
  `[200, 300, 500, 700, 900, 1100, 1300, 1500, 2000, 2500]` (= **$2 … $25** face ladder).
- **`ALLOWED_CHECKOUT_USD_CENTS`** — explicitly unions **`PHASE1_LADDER_USD_CENTS`** with catalog/mock faces (`server/src/lib/allowedCheckout.js`).
- **Amount-only rejection:** `resolveUnifiedCheckoutPricing` returns **`code: 'invalid_amount'`** when cents not on ladder or invalid integer range (`server/src/domain/pricing/unifiedCheckoutPricing.js`).
- **Mock economics aligned:** `MOCK_PACKAGE_ECONOMICS` retail faces moved onto ladder points (`server/src/domain/pricing/packageCatalog.js`).
- **Top-up mock catalog:** `topup/catalog/mockCatalog.ts` + `topup/pricing/phase1LadderUsdCents.ts` mirror the same ladder for airtime / data / calling bundles.

---

## 3) Block enforcement proof (403 before Stripe / DB)

Order verified in `server/src/app.js`:

1. `POST /webhooks/stripe` — raw body + `constructEvent` (**unchanged this pass**).
2. Global `express.json()`.
3. **`blockRestrictedCountries`** — blocks compliance dial strings + restricted ISO tokens in JSON/query (`senderCountry`, `destinationCountry`, `billingJurisdiction.*`, nested phones, etc.).
4. Payment routes (`payment.routes.js`) — pricing / Stripe session creation **after** middleware.

Automated coverage: `server/test/restrictedCountries.test.js`, `server/test/pricingGridCompliance.test.js`.

---

## 4) Stripe safety proof

- **No edits** to `server/src/routes/stripeWebhook.routes.js` signature verification.
- Restricted payloads cannot reach `createCheckoutSession` pricing path without passing middleware first (same process).

---

## 5) Self-healing / reliability architecture (existing — summarized)

Already production-grade in-tree (no risky rewrites this pass):

- **Retries:** `server/src/domain/fulfillment/retryPolicy.js`, `orchestrateStripeCall`, Reloadly circuit windows.
- **Circuit breaker:** Reloadly distributed breaker + fulfillment dispatch gates (`fulfillmentOutboundPolicy`, `assertFulfillmentDispatchAllowed`).
- **Health:** `/health`, `/ready`, `/metrics` via `health.routes.js` + ops surfaces (token-gated where configured).
- **Idempotency:** wallet/webtop idempotency keys and Stripe webhook idempotency paths covered by integration suite.

---

## 6) “Zero user-visible crash” objective

Full UX graceful-degradation across **all** Flutter routes is **not** completed as an isolated code sweep; server-side guardrails and webtop user-facing status mapping (`webtopUserFacingStatus.js`) continue to provide structured messaging. Further UI polish should be a dedicated UX task.

---

## 7) Tests executed (this pass)

| Command | Result |
|---------|--------|
| `npm --prefix server test` | **PASS** — 506 tests, 0 failures |
| `flutter test` | **PASS** — 17 tests |

---

## 8) Files touched (high level)

| Area | Files |
|------|--------|
| Policy + middleware | `restrictedRegions.js`, `blockRestrictedCountries.js` |
| Pricing | `unifiedCheckoutPricing.js`, `allowedCheckout.js`, `packageCatalog.js` |
| Top-up catalog | `mockCatalog.ts`, `topup/pricing/phase1LadderUsdCents.ts` (new) |
| Tests | `restrictedCountries.test.js`, `pricingGridCompliance.test.js` (new) |
| Report | `server/debug/FINAL_SUPER_SYSTEM_REPORT.md` |

---

## 9) Readiness

- **Commit-ready** after review: dial-prefix blocking + ladder alignment + mock economics shift may change recorded snapshots/scripts that assumed old mock faces — re-run any manual `npm run stage1-quote-snapshot` style scripts if you rely on exact historical cents.
- **Do not enable** live payments or Reloadly outbound via env in production without separate operational approval.

---

**Certification line:** Restricted jurisdictions and sanctioned dialing patterns are blocked at the HTTP boundary with **403 `restricted_region`** before checkout pricing runs; Phase 1 USD amounts outside the ladder receive **`invalid_amount`**; Stripe webhook verification path was **not modified**.

