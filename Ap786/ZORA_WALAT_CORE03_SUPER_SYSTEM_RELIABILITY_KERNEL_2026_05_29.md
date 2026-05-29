# CORE-03 Super-System Reliability Kernel

**Date:** 2026-05-29  
**Status:** **ARCHITECTURE + SOURCE REVIEW — NOT IMPLEMENTED**  
**Parents:** CORE-01 (catalog readiness review), CORE-02 (sandbox boundary), CORE-00 (fail-closed gate)  
**Default:** **NO-GO** — production, real money, controlled pilot, market launch, provider-ready, fix-proven

---

## 1. Mission

Define the **global engineering reliability kernel** for Zora-Walat: how the platform should resist duplicate money movement, false delivery, ambiguous provider state, unsafe retries, and ungoverned self-repair — **before** any new runtime “doctor” or auto-repair apply is enabled.

This document is the **master index** for CORE-03. It does **not** implement code, run drills, or claim operational proof.

---

## 2. Platform reliability goals (non-negotiable)

| Goal | Kernel doc |
|------|------------|
| No duplicate transaction | [No-duplicate control model](./ZORA_WALAT_CORE03_NO_DUPLICATE_TRANSACTION_CONTROL_MODEL_2026_05_29.md) |
| No-pay-no-service | [No-pay-no-service control model](./ZORA_WALAT_CORE03_NO_PAY_NO_SERVICE_CONTROL_MODEL_2026_05_29.md) |
| Audit-safe execution | [State machine review](./ZORA_WALAT_CORE03_PROVIDER_PAYMENT_ORDER_STATE_MACHINE_REVIEW_2026_05_29.md) |
| Auto-detection | [Signal matrix](./ZORA_WALAT_CORE03_AUTO_DETECTION_SIGNAL_MATRIX_2026_05_29.md) |
| Safe failover / retry bounds | [Failover boundary](./ZORA_WALAT_CORE03_SAFE_FAILOVER_AND_RETRY_BOUNDARY_2026_05_29.md) |
| Gated self-repair | [Self-repair classification](./ZORA_WALAT_CORE03_SELF_REPAIR_CLASSIFICATION_MODEL_2026_05_29.md) |
| Future detect-only doctor | [CORE-04 plan](./ZORA_WALAT_CORE03_RUNTIME_DOCTOR_FUTURE_IMPLEMENTATION_PLAN_2026_05_29.md) |

---

## 3. Hard invariants (kernel law)

| ID | Invariant | Enforcement today |
|----|-----------|-------------------|
| **INV-01** | No duplicate **customer-visible** settlement for the same logical purchase | **PARTIAL** — Stripe webhook DB id + checkout idempotency key (source); **NOT VERIFIED** end-to-end |
| **INV-02** | No service marked **delivered / fulfilled** without provider success proof per corridor spec | **PARTIAL** — lifecycle gates exist; **proof schema NOT VERIFIED** for all corridors |
| **INV-03** | No user charge path that implies delivery without payment + order correlation proof | **PARTIAL** — Stripe + `PaymentCheckout` linkage (source); pilot **NOT VERIFIED** |
| **INV-04** | No provider retry without idempotency key and operator-safe boundary | **PARTIAL** — Reloadly `customIdentifier` + registry (source); **NOT VERIFIED** under timeout chaos |
| **INV-05** | No terminal order without durable audit trail | **PARTIAL** — `writeOrderAudit` widespread (source); completeness **NOT VERIFIED** |
| **INV-06** | No ambiguous provider state marked **completed** | **PARTIAL** — classification helpers exist; **NOT VERIFIED** for all HTTP 200 shapes |
| **INV-07** | No financial/provider mutation via auto-repair without explicit approval | **POLICY** — self-healing modules exist; **apply NOT ENABLED** per Super-System policy |

Detail: [Failure mode & invariant model](./ZORA_WALAT_CORE03_FAILURE_MODE_AND_INVARIANT_MODEL_2026_05_29.md).

---

## 4. Reliability kernel layers (conceptual)

```
┌─────────────────────────────────────────────────────────────┐
│ L4 Governance (Ap786 CORE-00..03, DR templates, NO-GO)     │
├─────────────────────────────────────────────────────────────┤
│ L3 Detection (future CORE-04 doctor: scanners, dry-run only)  │
├─────────────────────────────────────────────────────────────┤
│ L2 Orchestration (webhooks, queues, recovery workers)        │
├─────────────────────────────────────────────────────────────┤
│ L1 Money path (Stripe checkout, wallet top-up idempotency)   │
├─────────────────────────────────────────────────────────────┤
│ L0 Provider I/O (Reloadly / mock / webtop adapters)          │
└─────────────────────────────────────────────────────────────┘
```

**CORE-03 defines L3–L4 requirements.** L2–L0 are **reviewed read-only** in this pack; changes require separate approved change sets.

---

## 5. Source review summary (read-only, 2026-05-29)

| Surface | Observed | Reliability posture |
|---------|----------|---------------------|
| Phase 1 airtime delivery | `deliveryAdapter.js` → `reloadly` or `mock`; outbound policy gate | **Implemented / partial** — mock fallback env-gated |
| Web top-up fulfillment | `providerRegistry.js` — `mock`, `reloadly` (AF airtime) | **Partial** — not full catalog |
| Data packages | `catalogResolver.js` returns `null` for data SKUs | **Disabled** at pricing |
| International call | `productTypes` + mock catalog rows; resolver returns `null` | **Placeholder** |
| Stripe webhooks | `StripeWebhookEvent` PK + Redis shadow ack + P2002 replay | **Implemented** — staging proof **INCONCLUSIVE** (program) |
| Hosted checkout | `PaymentCheckout.idempotencyKey` UNIQUE + reuse helpers | **Implemented** — **NOT VERIFIED** under load |
| Order lifecycle | `orderLifecycle.js` — PENDING→PAID→PROCESSING→FULFILLED | **Implemented** |
| Provider idempotency | `reloadlyClient.js` comments + idempotency registry | **Implemented** — **NOT VERIFIED** live |
| Audit | `orderAuditService.js` + redaction | **Implemented** |
| Self-healing code | `moneyPathDriftRepair.js` exists | **Apply NOT ENABLED** |
| CLI doctor | `server/tools/zw-doctor.mjs` | **Read-only modes** — not full CORE-04 scanner |

Full detail: [State machine review](./ZORA_WALAT_CORE03_PROVIDER_PAYMENT_ORDER_STATE_MACHINE_REVIEW_2026_05_29.md).

---

## 6. Audit-first execution model

| Phase | Activity | Mutation |
|-------|----------|----------|
| 1 | File CORE-03 pack | Docs only |
| 2 | Source review + gap IDs | None |
| 3 | Define detection matrix + repair classes | None |
| 4 | Implement CORE-04 doctor (**detect-only**) | Read-only queries |
| 5 | File evidence (CORE3-EV-*) | Evidence store only |
| 6 | Class C repair (if ever) | **Approval-gated** + audit + rollback |

**Steps 4–6 are NOT AUTHORIZED by this document.**

---

## 7. Explicit NO-GO (conservative verdict)

| Claim | Status |
|-------|--------|
| CORE-03 reliability kernel | **FILED** |
| Runtime doctor (CORE-04) | **NOT IMPLEMENTED** |
| Provider runtime proof | **NOT VERIFIED** |
| Reloadly sandbox execution | **NOT EXECUTED** |
| No-pay-no-service runtime enforcement | **NOT VERIFIED** |
| Duplicate provider prevention | **NOT VERIFIED** (code **PARTIAL**) |
| Self-repair apply | **NOT ENABLED** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |
| Fix proven | **NOT CLAIMED** |

---

## 8. Document map

| # | File |
|---|------|
| 1 | This file |
| 2 | [Failure mode & invariant model](./ZORA_WALAT_CORE03_FAILURE_MODE_AND_INVARIANT_MODEL_2026_05_29.md) |
| 3 | [Payment / order / provider state machine review](./ZORA_WALAT_CORE03_PROVIDER_PAYMENT_ORDER_STATE_MACHINE_REVIEW_2026_05_29.md) |
| 4 | [No-duplicate transaction control](./ZORA_WALAT_CORE03_NO_DUPLICATE_TRANSACTION_CONTROL_MODEL_2026_05_29.md) |
| 5 | [No-pay-no-service control](./ZORA_WALAT_CORE03_NO_PAY_NO_SERVICE_CONTROL_MODEL_2026_05_29.md) |
| 6 | [Auto-detection signal matrix](./ZORA_WALAT_CORE03_AUTO_DETECTION_SIGNAL_MATRIX_2026_05_29.md) |
| 7 | [Safe failover & retry boundary](./ZORA_WALAT_CORE03_SAFE_FAILOVER_AND_RETRY_BOUNDARY_2026_05_29.md) |
| 8 | [Self-repair classification](./ZORA_WALAT_CORE03_SELF_REPAIR_CLASSIFICATION_MODEL_2026_05_29.md) |
| 9 | [Runtime doctor future plan (CORE-04)](./ZORA_WALAT_CORE03_RUNTIME_DOCTOR_FUTURE_IMPLEMENTATION_PLAN_2026_05_29.md) |
| 10 | [Risk register](./ZORA_WALAT_CORE03_RISK_REGISTER_2026_05_29.md) |

---

*End of CORE-03 master kernel.*
