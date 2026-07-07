# ZORA TARGET ARCHITECTURE — 2026-07-07

## Status

**PLAN ONLY** — architecture specification for a future Afghanistan-focused super-app.  
**Not implemented.** **Not deployed.** **No real money.** **No provider activation.** **No market launch claim.**

**Legacy system:** Zora-Walat (Phase-1 mobile top-up, Stripe, Reloadly scaffold) — **frozen, separate bounded context.**

---

## Target product vision (planning)

| Layer | Description |
|-------|-------------|
| Master brand (candidate) | **Zora** |
| First live module (future) | **Taxi / ride** — after implementation gate only |
| Financial product (future) | **Zora Card** — prepaid stored balance **placeholder**, disabled; not credit card; not EMI |
| Later modules | Food (phase 2), grocery, mobile top-up, data, utility bills — **placeholders disabled** |

---

## Bounded context separation

```
┌─────────────────────────────────────────────────────────────────┐
│  LEGACY (FROZEN) — Zora-Walat                                    │
│  server/src/payment, fulfillment, reloadly, Phase-1 checkout     │
│  Evidence: Ap786, L-89B, L-90*                                   │
│  Rule: NO new features; NO taxi/card coupling without gate       │
└─────────────────────────────────────────────────────────────────┘
                              │
                    shared patterns only (auth, audit, CI)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FUTURE (GREENFIELD) — Zora super-app modules                    │
│  Planned paths (not created yet):                                │
│    zora-taxi/*  zora-dispatch/*  zora-card-placeholder/*        │
│  Rule: feature flags default OFF; no Stripe/Reloadly reuse      │
│        without explicit money-path integration gate              │
└─────────────────────────────────────────────────────────────────┘
```

**Hard rule:** Taxi dispatch must not call `fulfillReloadlyDelivery`, `runDeliveryAdapter`, or Phase-1 `PaymentCheckout` without a dedicated, authorized integration design gate.

---

## Module catalog (target — all planning)

### Core platform

| Module | Purpose | Initial state | Reuse from Zora-Walat |
|--------|---------|---------------|------------------------|
| **auth** | OTP, JWT, session, device binding | Plan | Patterns: `auth.routes.js`, `requireAuth`, OTP transport gates |
| **users** | Passenger, driver, admin profiles | Plan | `User` model patterns — **new tables**, not extend PaymentCheckout |
| **audit log** | Immutable admin + safety events | Plan | `AuditLog` model + `orderAuditService` patterns |

### Taxi (phase 1 target — architecture only)

| Module | Purpose | Initial state |
|--------|---------|---------------|
| **driver onboarding** | KYC docs, license, background check hooks | Plan — **no PII in repo** |
| **vehicle onboarding** | Plate, insurance, inspection status | Plan |
| **taxi booking** | Request ride, pickup/dropoff, status | Plan |
| **dispatch** | Assign driver, ETA, cancel, no-show | Plan |
| **fare estimate** | Distance/time pricing rules — **cash fare display only** | Plan |
| **cash payment tracking** | Record cash collected — **not card settlement** | Plan |
| **admin control tower** | Live map, intervene, suspend driver | Plan |
| **support / complaints** | Ticket, escalation, resolution codes | Plan |

### Financial placeholders (disabled)

| Module | Purpose | Activation |
|--------|---------|------------|
| **Zora Card prepaid ledger** | Internal balance ledger — **no spend** | `ZORA_CARD_ENABLED=false` |
| **mobile top-up placeholder** | Links to legacy Reloadly path conceptually | `ZORA_TOPUP_ENABLED=false` |
| **bills placeholder** | Water/electricity UI shell | `ZORA_BILLS_ENABLED=false` |
| **food delivery placeholder** | Phase 2 | `ZORA_FOOD_ENABLED=false` |

---

## Zora Card (prepaid placeholder) — architectural constraints

| Constraint | Requirement |
|------------|-------------|
| Product type | **Prepaid balance only** — not credit, not lending, not EMI |
| Default | **Disabled** — no API routes, no balance mutation |
| Ledger | Separate chart of accounts from Phase-1 `LedgerJournalEntry` until counsel approves merge |
| Cash-in / cash-out | **Blocked** — no agent network, no bank rails in plan |
| Bank / EMI approval | Required before any `ZORA_CARD_ENABLED=true` gate |
| Stripe | **Not wired** in taxi MVP architecture |

---

## Required feature flags (specification — not implemented)

| Flag | Default | Scope |
|------|---------|-------|
| `ZORA_SUPERAPP_ENABLED` | `false` | Master kill switch for all new modules |
| `ZORA_TAXI_ENABLED` | `false` | Taxi booking + dispatch |
| `ZORA_TAXI_CASH_TRACKING_ENABLED` | `false` | Cash fare recording |
| `ZORA_CARD_ENABLED` | `false` | Prepaid balance — **must stay false** until legal+bank gate |
| `ZORA_TOPUP_ENABLED` | `false` | Mobile top-up module |
| `ZORA_BILLS_ENABLED` | `false` | Utility bills |
| `ZORA_FOOD_ENABLED` | `false` | Food delivery phase 2 |
| `ZORA_LEGACY_WALAT_CHECKOUT_ENABLED` | `false` in new app shell | Isolate Phase-1 money path |
| `PHASE1_FULFILLMENT_OUTBOUND_ENABLED` | unchanged on legacy | Legacy only |

All flags must be **explicit** (no implicit enable from `NODE_ENV`).

---

## Required security gates (before any implementation)

| Gate | Requirement |
|------|-------------|
| **RBAC** | Roles: `passenger`, `driver`, `dispatcher`, `admin`, `support` — least privilege; separate from legacy `staff`/`admin` |
| **Auth** | No `DEV_CHECKOUT_AUTH_BYPASS` pattern; no auth bypass env on any public host |
| **Admin mutations** | Dual-control for suspend, refund-like adjustments, manual fare override |
| **Rate limits** | Per-IP and per-user on booking, dispatch, onboarding uploads |
| **Input validation** | Geo bounds (Afghanistan service polygon — counsel-defined), phone normalization |
| **CORS** | Explicit allowlist per app build |
| **Secrets** | `secrets:scan` in CI; no credentials in `Ap786` or pivot docs |
| **PII** | Driver/passenger documents off-repo; encrypted object storage when implemented |
| **Ops token** | Separate from legacy `OPS_HEALTH_TOKEN` or scoped sub-tokens |

Audit reference: R-008, R-009, R-010 in `ZORA_WALAT_SECURITY_RISK_REGISTER_2026_07_07.md`.

---

## Required audit logging (specification)

Every future mutating action must emit structured audit events (mirror `AuditLog` discipline):

| Event family | Examples |
|--------------|----------|
| `taxi.ride.*` | requested, assigned, started, completed, cancelled |
| `taxi.driver.*` | onboarded, suspended, document_verified |
| `taxi.dispatch.*` | manual_assign, force_cancel |
| `taxi.cash.*` | fare_recorded, dispute_opened |
| `admin.*` | login, privilege_used, config_change |
| `zora_card.*` | **none while disabled** |

Logs must pass through **secret redaction** (`phase1ObservabilitySanitize` pattern).

---

## Required RBAC matrix (planning)

| Action | Passenger | Driver | Dispatcher | Support | Admin |
|--------|-----------|--------|------------|---------|-------|
| Request ride | ✓ | — | — | — | — |
| Accept ride | — | ✓ | — | — | — |
| Manual dispatch | — | — | ✓ | — | ✓ |
| View PII full | — | — | ✓ | limited | ✓ |
| Suspend driver | — | — | — | — | ✓ |
| Cash adjustment | — | — | — | — | ✓ (dual-control) |
| Enable Zora Card | — | — | — | — | **blocked by flag** |

---

## Required tests before implementation (outline)

| Area | Test type | Blocker if missing |
|------|-----------|-------------------|
| Auth / OTP | Unit + integration | YES |
| Ride state machine | Unit — no payment side effects | YES |
| Dispatch assignment | Concurrency / idempotency | YES |
| Cash tracking | No double-close ride | YES |
| RBAC | Negative tests per role | YES |
| Feature flags | All modules off by default | YES |
| Legacy isolation | Taxi routes cannot import Reloadly client | YES |
| Security | No unauthenticated admin mutations | YES |

**CI gate:** extend `.github/workflows/ci.yml` only in implementation phase — not in planning.

---

## Infrastructure target (planning — not provisioned)

| Component | Taxi MVP (future) | Legacy Zora-Walat |
|-----------|-------------------|-------------------|
| API | New service or namespaced router under separate deploy | `zora-walat-api-staging` unchanged |
| Database | New schema namespace or DB — **do not alter Phase-1 tables** | Frozen migrations |
| Maps / geo | External provider TBD — **no provider claim** | N/A |
| Push | Firebase pattern exists in Flutter — reuse cautiously | Existing |
| Deploy | Separate Vercel project or `ZW_API_DEPLOYMENT_TIER=zora-taxi` | Staging/production walat |

---

## NON_CLAIMS (this document)

- Does **not** approve taxi operation in Afghanistan
- Does **not** approve Zora Card, top-up, bills, or food
- Does **not** prove maps, dispatch, or payment providers
- Does **not** replace legal/compliance gates (L-90C*)
- Does **not** authorize implementation or hiring drivers

---

*Architecture plan only. No routes, schema, or flags implemented.*
