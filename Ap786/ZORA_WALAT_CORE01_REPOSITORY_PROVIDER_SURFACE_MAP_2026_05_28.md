# CORE-01 Repository Provider Surface Map

**Date:** 2026-05-28
**Review type:** Read-only file inspection (no API calls, no env value reads)
**Parent:** [CORE-01 readiness review](./ZORA_WALAT_CORE01_PROVIDER_CATALOG_RELOADLY_READINESS_REVIEW_2026_05_28.md)

---

## 1. Files inspected (representative)

Inspection method: glob search + targeted `grep` + header reads. Not every file in repo was opened line-by-line.

### 1.1 Reloadly / provider core

| Path | Role |
|------|------|
| `server/src/services/reloadlyClient.js` | Reloadly HTTP client, operators fetch, topup send |
| `server/src/services/reloadlyAuthService.js` | OAuth token cache |
| `server/src/domain/fulfillment/reloadlyTopup.js` | Topup payload + request |
| `server/src/domain/fulfillment/reloadlyWebTopupFulfillment.js` | Web top-up payload builder — **AF + airtime only** |
| `server/src/domain/fulfillment/reloadlyOperatorMapping.js` | Operator key → Reloadly operator ID |
| `server/src/services/topupFulfillment/providers/reloadlyWebTopupProvider.js` | Registered fulfillment adapter |
| `server/src/services/reloadlyProviderCircuitBreaker.js` | Circuit breaker |
| `server/src/services/reloadlyIdempotencyRegistry.js` | Idempotency registry |
| `server/src/services/reloadlyTopupInFlight.js` | In-flight duplicate prevention |
| `server/src/services/reloadlyTransactionInquiry.js` | Transaction inquiry |
| `server/src/config/reloadlyOperatorIdDefaults.js` | Default operator ID map |
| `server/src/config/productionReloadlyGuard.js` | Production guardrails |
| `server/src/config/airtimeReloadlyStartup.js` | Startup checks |
| `server/src/providers/dtone.placeholder.js` | DT One placeholder |

### 1.2 Provider registry / routing

| Path | Role |
|------|------|
| `server/src/services/topupFulfillment/providerRegistry.js` | `mock` + `reloadly` registry |
| `server/src/services/topupFulfillment/providers/mockTopupProvider.js` | Mock adapter |
| `server/src/services/providers/providerRouter.js` | Legacy airtime router |
| `server/src/domain/ports/rechargeProviderPort.js` | Provider port boundary |
| `server/src/domain/delivery/providerFallbackPolicy.js` | Fallback policy |

### 1.3 Catalog / pricing

| Path | Role |
|------|------|
| `topup/catalog/types.ts` | Product types: `airtime`, `data`, `calling` |
| `topup/catalog/mockCatalog.ts` | Client mock catalog (all three types) |
| `topup/catalog/queries.ts` | Catalog query helpers |
| `server/src/routes/catalog.routes.js` | `GET /catalog/airtime`, `/sender-countries` |
| `server/src/controllers/catalogController.js` | Airtime catalog controller |
| `server/src/domain/pricing/productTypes.js` | Phase 1 product type lock |
| `server/src/domain/pricing/catalogResolver.js` | Quote resolver — data/call return null |
| `server/src/domain/pricing/packageCatalog.js` | Mock package economics |
| `server/src/lib/allowedCheckout.js` | Checkout amount allowlist |
| `server/src/lib/dataPackagePricing.js` | Data pricing helpers (referenced) |

### 1.4 Top-up / order / webhook

| Path | Role |
|------|------|
| `server/src/routes/topupOrder.routes.js` | Top-up order routes |
| `server/src/controllers/topupOrderController.js` | Order controller |
| `server/src/services/topupOrder/topupOrderService.js` | Order service |
| `server/src/services/topupOrder/webtopupWebhookHandlers.js` | Stripe webhook handlers |
| `server/src/domain/topupOrder/webtopupStateMachine.js` | Order state machine |
| `server/src/services/topupFulfillment/webTopupFulfillmentExecutor.js` | Fulfillment executor |
| `server/src/services/topupFulfillment/webTopupFulfillmentService.js` | Fulfillment service |
| `components/topup/ZoraWalatTopUp.tsx` | Web top-up UI |
| `topup/checkoutSession.ts` | Checkout session client |

### 1.5 Config / env (names only — values not read)

| Path | Role |
|------|------|
| `server/src/config/env.js` | Central env parsing |
| `server/src/config/webtopConfig.js` | Web top-up env slice |
| `server/src/config/webtopDeploymentConfig.js` | Deployment config |
| `.env.local.example` | Root env example (filename confirmed) |
| `server/.env.local.example` | Server env example (filename confirmed) |
| `server/.env.production.example` | Production env example (filename confirmed) |

### 1.6 Proof / runbook scripts (listed, not executed)

| Path | Role |
|------|------|
| `server/scripts/reloadly-sandbox-readiness.mjs` | Sandbox readiness |
| `server/scripts/webtopup-reloadly-sandbox-verify.mjs` | Web top-up sandbox verify |
| `server/scripts/proof-reloadly-dry-run.mjs` | Dry-run proof |
| `server/scripts/preflight-reloadly-live.mjs` | Live preflight |
| `server/docs/runbooks/RELOADLY_SANDBOX_GOLDEN_PATH.md` | Runbook |
| `server/docs/PHASE1_PROFIT_REPORT.md` | Phase 1 scope lock doc |

---

## 2. Provider-related modules found

- **Primary:** Reloadly Topups stack (OAuth, send, inquiry, circuit breaker, idempotency)
- **Secondary:** Mock top-up provider for dev/test
- **Placeholder:** DT One (`dtone.placeholder.js`)
- **Legacy airtime:** `reloadlyAirtimeProvider.js`, `mockAirtimeProvider.js`, delivery adapter path
- **Observability:** `reloadlyFulfillmentObservability.js`, `providerOutcomeRegistry.js`, `providerExecutionCorrelation.js`

---

## 3. Top-up-related modules found

- Web top-up order lifecycle (create → Stripe checkout → webhook → fulfillment queue → terminal state)
- Afghanistan operator allowlist: `roshan`, `mtn`, `etisalat`, `afghanWireless`
- Phase 1 minimum checkout and margin floor (see `PHASE1_PROFIT_REPORT.md`)
- Reloadly web top-up limited to **country AF**, **product airtime**
- Wallet top-up path separate (`server/scripts/wallet-topup-load.mjs` — not in CORE-01 execution scope)

---

## 4. Data-package-related modules found

| Module | Observation |
|--------|-------------|
| `productTypes.js` | `DATA_PACKAGE` reserved, not checkout-active |
| `catalogResolver.js` | Returns `null` for data bundle IDs |
| `allowedCheckout.js` | Rejects data package checkout with explicit error |
| `mockCatalog.ts` | UI mock data SKUs exist |
| `dataPackagePricing.js` | Referenced; no live provider catalog binding observed |

**No Reloadly data-product fulfillment adapter identified in primary web top-up registry.**

---

## 5. International-call-related modules found

| Module | Observation |
|--------|-------------|
| `topup/catalog/types.ts` | Product type `calling` |
| `mockCatalog.ts` | Calling bundle tiers with minute estimates |
| `packageCatalog.js` | `mock_intl_weekly` / `international_call_weekly` mock economics |
| `productTypes.js` | `CALLING_CREDIT` reserved |
| `OrderSuccessPanel.tsx` | Handles `calling` display branch |
| Marketing copy (`messages/en.ts`, `app/layout.tsx`) | "Airtime, data & calling" |

**No voice/SIP/PIN/voucher provider adapter or checkout-active calling path found.**

---

## 6. Checkout / webhook / order-state dependencies found

| Dependency | Module(s) |
|------------|-----------|
| Checkout session creation | `topupOrderController`, `checkoutSession.ts`, Stripe integration layer |
| Webhook signature + slim path | Stripe webhook entrypoints (referenced in tests/docs) |
| Paid vs unpaid invariant | `webtopupStateMachine.js`, webhook handlers |
| Fulfillment eligibility | `fulfillmentEligibility.js`, Phase 1 `mobile_topup` gate |
| Idempotency | Webhook dedupe, `FulfillmentAttempt`, Reloadly registries |
| Reconciliation | `webtopupMoneyPathReconciliationEngine.js`, reconcile env names in `webtopConfig.js` |

---

## 7. Env / config filenames observed (no values)

**Example files (presence only):**

- `.env.local.example`
- `server/.env.local.example`
- `server/.env.production.example`

**Env variable names referenced in code (not read from disk):**

| Category | Names (sample) |
|----------|----------------|
| Reloadly | `RELOADLY_CLIENT_ID`, `RELOADLY_CLIENT_SECRET`, `RELOADLY_SANDBOX`, `RELOADLY_OPERATOR_MAP_JSON`, `RELOADLY_WEBTOPUP_PROVIDER_ACTIVE`, `RELOADLY_CIRCUIT_BREAKER_DISABLED`, `RELOADLY_IDEMPOTENCY_REGISTRY_TTL_SECONDS`, `RELOADLY_TOPUP_IN_FLIGHT_TTL_SECONDS` |
| Provider selection | `WEBTOPUP_FULFILLMENT_PROVIDER`, `AIRTIME_PROVIDER`, `FULFILLMENT_DISPATCH_ENABLED`, `FULFILLMENT_DISPATCH_KILL_SWITCH` |
| Stripe | `STRIPE_WEBHOOK_SECRET`, `ZW_CONTROLLED_STRIPE_LIVE_PROOF`, pricing fee bps vars |
| Web top-up ops | `WEBTOPUP_*`, `RECONCILE_*` slice in `webtopConfig.js` |

---

## 8. Unknown or missing areas

| Gap | Notes |
|-----|-------|
| Live Reloadly operator catalog vs repo operator map | **Not verified** — no API call in this review |
| Reloadly product/amount matrix for AF operators | **Not verified** |
| Data package provider SKU mapping | **Missing** beyond mock catalog |
| International call product definition | **Unresolved** — airtime vs PIN vs VoIP vs bundle |
| Production env actual values | **Not inspected** (forbidden) |
| Last successful sandbox dispatch timestamp | **Not verified** in this session |
| Cross-region catalog for non-AF destinations | UI types exist; server fulfillment AF-only for Reloadly web top-up |

---

*CORE-01 surface map — repository inspection only; no secrets printed*
