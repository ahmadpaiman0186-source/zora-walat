# CORE-03 Provider / Payment / Order State Machine Review

**Date:** 2026-05-29  
**Method:** Read-only source inspection (no runtime, no secrets)  
**Verdict:** **PARTIAL implementation observed — NOT VERIFIED in staging/production**

---

## 1. Review boundary

Authorized: file path and symbol references from repository tree.  
Not authorized: executing tests, webhooks, Reloadly, DB queries, or env value reads.

---

## 2. Product corridors vs runtime

| Corridor | Catalog / pricing | Checkout | Fulfillment provider | Review verdict |
|----------|-------------------|----------|----------------------|----------------|
| **Mobile top-up (Phase 1 airtime)** | `packageCatalog.js`, `getAirtimeSku`, `catalogResolver` | `createCheckoutSession` + Stripe | `deliveryAdapter.js` → Reloadly or mock | **Partial — primary path** |
| **Data package** | Mock rows; `catalogResolver` returns **null** for data | Blocked at resolver | WebTopup types include `data`; Reloadly webtop build rejects non-airtime AF | **Disabled / placeholder** |
| **International call** | `international_call_weekly` mock; resolver **null** | Not active | Mock topup declares `calling` capability only | **Placeholder** |
| **Web top-up (separate order model)** | Topup order routes | PaymentIntent path | `ReloadlyWebTopupProvider` — AF airtime | **Partial — parallel path** |

---

## 3. Reloadly integration status (source)

| Component | Status | Notes |
|-----------|--------|-------|
| `reloadlyClient.js` | **Implemented** | OAuth, POST top-up, inquiry, idempotency registry |
| `reloadlyAuthService.js` | **Implemented** | Token fetch |
| `deliveryAdapter.js` | **Implemented** | Routes `AIRTIME_PROVIDER=reloadly` |
| `ReloadlyWebTopupProvider` | **Implemented** | Narrow: AF + airtime |
| `reloadlyProviderCircuitBreaker.js` | **Implemented** | Window / ratio env-driven |
| `reloadlyIdempotencyRegistry.js` | **Implemented** | Redis/registry TTL |
| `dtone.placeholder.js` | **Placeholder** | Not primary |
| Mock fallback | **Implemented** | Explicit env; must not mask prod failures |
| Sandbox proof scripts | **Present in package.json** | **NOT EXECUTED** in CORE-03 |

---

## 4. Payment → order → provider lifecycle (Phase 1)

### 4.1 Observed order states (`orderLifecycle.js`)

```
PENDING → PAID → PROCESSING → FULFILLED | FAILED
         ↘ CANCELLED (from PENDING)
         ↘ FAILED (from PAID/PROCESSING)
PROCESSING → PAID (recovery re-queue)
```

| Transition | Typical trigger (source-level) |
|------------|--------------------------------|
| → PAID | Stripe `checkout.session.completed` / payment intent success handlers |
| → PROCESSING | Fulfillment scheduling after paid |
| → FULFILLED | Delivery adapter success |
| → FAILED | Provider terminal / policy |

### 4.2 Payment objects

| Entity | Role |
|--------|------|
| `PaymentCheckout` | Hosted checkout row; `idempotencyKey`, `orderStatus`, Stripe session metadata |
| `FulfillmentAttempt` | Provider I/O attempts; ties to Reloadly `customIdentifier` |
| `StripeWebhookEvent` | Webhook idempotency PK |
| `WebTopupOrder` | Parallel web top-up money path |

### 4.3 Wallet path (adjacent)

`POST /api/wallet/topup` — separate idempotency contract (`Idempotency-Key` header). Cross-correlation with Phase 1 checkout **not fully reviewed** in this pack — wallet mismatch = **NOT VERIFIED**.

---

## 5. Idempotency, retry, audit (gaps)

| Control | Observed in source | Gap / NOT VERIFIED |
|---------|-------------------|---------------------|
| Stripe webhook dedupe | DB insert + P2002 + Redis shadow | Staging 404/timeout history (program) |
| Checkout idempotency | UNIQUE `idempotencyKey` | Client misuse / missing header |
| Reloadly POST idempotency | Registry + attempt-scoped key | Timeout mid-flight duplicate send |
| Fulfillment queue replay | `phase1FulfillmentReplayDiscipline.js` | Double job without discipline |
| Order audit | `writeOrderAudit` + redaction | Completeness per transition |
| Processing recovery | `processingRecoveryService` | Sandbox conservative flag |
| No-pay-no-service | Lifecycle + CORE-02 policy | **All corridors NOT VERIFIED** |
| Provider response persistence | `FulfillmentAttempt` request/response summary | Field population **NOT VERIFIED** |

---

## 6. No-pay-no-service in runtime vs docs

| Mechanism | Docs only | Runtime (source suggests) |
|-----------|-----------|---------------------------|
| CORE-02 policy pack | **YES** | N/A |
| Block checkout when catalog invalid | Partial (`allowedCheckout`, resolver null) | **YES for data/call** |
| Block FULFILLED on provider fail | Policy | **Transition rules** — depends on adapter outcome mapping |
| Paid + outbound disabled | Policy | **Returns UNAVAILABLE** in `deliveryAdapter` when outbound blocked |

**Conclusion:** **Partial runtime scaffolding; full no-pay-no-service NOT VERIFIED.**

---

## 7. Duplicate provider execution

| Control | Source evidence |
|---------|-----------------|
| New attempt → new `customIdentifier` | `reloadlyClient.js` comment |
| Idempotency registry hit | `reloadly_idempotency_registry_hit` log event |
| Replay discipline doc | `phase1FulfillmentReplayDiscipline.js` |

**Conclusion:** **Code intent present — NOT VERIFIED under concurrency/timeout.**

---

## 8. Provider response durable persistence

| Store | Content |
|-------|---------|
| `FulfillmentAttempt` | request/response summaries (JSON) |
| Reloadly reports inquiry | Read-only reconciliation paths |
| Order audit | Event names + redacted payload |

**Whether every provider POST persists sufficient proof for INV-02: NOT VERIFIED.**

---

## 9. CORE-03 recommendations (planning only)

1. Implement CORE-04 scanners for FM-07, FM-08, FM-10, FM-12 (detect-only).  
2. File CORE3-EV-* before claiming any invariant **PROVEN**.  
3. Keep self-repair **Class A/B detect-only** until evidence accepts Class C.  
4. Do not enable data/call corridors until `catalogResolver` and provider adapters align (CORE-01 gaps).

---

*End of state machine review.*
