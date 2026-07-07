# ZORA SAFE MIGRATION PLAN — 2026-07-07

## Status

**PLAN ONLY** — phased migration from frozen Zora-Walat legacy toward a future Zora Afghanistan super-app (taxi-first).  
**No implementation authorized** by this document.

**Inputs:** `docs/audits/ZORA_WALAT_*_2026_07_07.md`, `ZORA_PIVOT_DECISION_2026_07_07.md`, `ZORA_TARGET_ARCHITECTURE_2026_07_07.md`

---

## Migration principles

1. **Freeze before build** — legacy evidence and money path untouched
2. **Greenfield modules** — taxi/card/food not bolted onto Phase-1 checkout
3. **Gate per phase** — operator sign-off required between phases
4. **Fail-closed flags** — all financial modules default disabled
5. **Rollback always** — legacy deploy path remains independently deployable
6. **Proof over narrative** — no phase advance without evidence artifact

---

## Phase 0 — Freeze and protect Zora-Walat legacy

**Objective:** Lock legacy system as reference; prevent pivot work from breaking evidence.

| Action | Owner | Mutation |
|--------|-------|----------|
| Tag audit branch merged; planning branch from audit | Operator | Git only when authorized |
| Document locked claims (master check enums) | Done in audit | None |
| Do not delete `Ap786/**` | All agents | **Forbidden** |
| Do not touch untracked `Ap786/evidence/L87A*` | All agents | **Forbidden** |
| Keep `zora-walat-api-staging` env unchanged | Operator | No env edit without gate |
| Archive audit + pivot docs | Planning | `docs/audits/`, `docs/pivot/` only |

**Pass criteria:** Legacy deploy reproducible; audit files on `main` or agreed branch; no server diffs from pivot team.

**Claims unlocked:** none

---

## Phase 1 — Planning only (current)

**Objective:** Architecture, migration plan, brand decision docs — **this phase**.

| Deliverable | Status |
|-------------|--------|
| `ZORA_PIVOT_DECISION_2026_07_07.md` | Created |
| `ZORA_TARGET_ARCHITECTURE_2026_07_07.md` | Created |
| `ZORA_SAFE_MIGRATION_PLAN_2026_07_07.md` | Created |
| Taxi PRD / user stories | Future — not in scope unless authorized |
| RBAC + audit event catalog detail | Future planning gate |

**Pass criteria:** Operator accepts PLAN-ONLY CONDITIONAL GO; no code changes outside `docs/pivot/`.

**Claims unlocked:** none

---

## Phase 2 — Brand / legal clearance only

**Objective:** Name clearance, entity formation plan execution (external), counsel engagement — **no product code**.

| Step | Dependency | External |
|------|------------|----------|
| `L-90C1A1-OFFICIAL-NAME-CLEARANCE-READONLY` | Phase 1 complete | Gov/trademark searches |
| Entity formation (if operator proceeds) | Separate authorized gate | State/federal filing |
| Afghanistan taxi regulatory scoping | Local counsel | **Required** before taxi MVP code |
| Zora vs ZoraXpress final brand lock | Clearance results | — |
| Customer legal doc outline for taxi (not airtime) | Counsel | — |

**Pass criteria:** Redacted evidence index (no private values in repo); `NAME_CLEARANCE_COMPLETED` or documented blockers; counsel scope memo (private).

**Claims unlocked:** none (legal existence ≠ launch)

**Forbidden:** Stripe profile change, app store listing, driver recruitment

---

## Phase 3 — Taxi MVP architecture only

**Objective:** Detailed technical design — schema sketches, API contracts, Flutter screen map, test plan — **still no implementation**.

| Work product | Location (proposed) |
|--------------|---------------------|
| OpenAPI / contract draft | `docs/pivot/taxi/` (future) |
| State machine diagrams | Same |
| DB namespace design (separate from PaymentCheckout) | Same |
| Threat model | Same |
| Feature flag registry | Same |

**Pass criteria:** Security review of design; explicit legacy isolation sign-off; operator approval checkpoint **PIVOT-CP-03**.

**Claims unlocked:** none

**Forbidden:** Prisma migrations, new routes in `server/src/app.js`, Flutter taxi screens

---

## Phase 4 — Taxi implementation (only after approval)

**Objective:** Build taxi module in isolated code paths; **cash tracking only**; no card, no top-up, no Stripe live.

| Requirement | Gate |
|-------------|------|
| Separate package or `server/src/zora-taxi/` namespace | Code review |
| `ZORA_TAXI_ENABLED=false` default in all envs | CI test |
| CI green including new tests | `.github/workflows/ci.yml` |
| Staging deploy to **new** or isolated project | Operator |
| No import of `reloadlyClient`, `paymentCheckoutService` from taxi | Static audit |
| Driver onboarding stores docs off-repo | Security |

**Pass criteria:** Staging ride simulation with test accounts; audit log proof; RBAC negative tests; **no public launch**.

**Claims unlocked:** none until operational/legal gate

**Rollback:** Feature flag off; revert deploy; legacy walat API unaffected

---

## Phase 5 — Card / payment placeholders only

**Objective:** UI + API stubs for Zora Card, top-up, bills — **all disabled**; ledger read-only or noop.

| Module | Allowed | Forbidden |
|--------|---------|-----------|
| Zora Card balance display (mock) | Placeholder screens | Real balance, real load |
| Top-up tab | Disabled stub | Reloadly/Stripe calls |
| Bills tab | Disabled stub | Provider calls |

**Pass criteria:** Penetration test on stubs; flags verified false; counsel memo on e-money scope (private).

**Prerequisites:** Phase 4 stable; entity + bank; **separate** `ZORA-CARD-LEGAL-GATE`

---

## Phase 6 — Food delivery (after taxi stability)

**Objective:** Plan and implement food module only when taxi ops proven in controlled pilot.

**Prerequisites:** Taxi pilot evidence; staffed support; incident runbook; **FOOD-LEGAL-GATE**

**Default:** **Not authorized** in current planning horizon.

---

## Reuse map (from audit)

### Safe to reuse (patterns / selective copy in Phase 4+)

| Asset | Use for Zora |
|-------|--------------|
| `server/src/middleware/authMiddleware.js` patterns | JWT auth |
| `server/src/middleware/rateLimits.js` patterns | API limits |
| `server/src/infrastructure/logging/phase1ObservabilitySanitize.js` | Log redaction |
| `server/test/**` structure | Test discipline |
| `.github/workflows/ci.yml` | CI template |
| Flutter auth/navigation shell | UI bootstrap — **rebrand later** |
| `AuditLog` pattern | Taxi audit events |
| Operator harness **pattern** | Staging taxi operator tools (new script) |

### Must remain frozen (do not modify for pivot)

| Asset | Reason |
|-------|--------|
| `Ap786/**` | Evidence chain |
| `server/handlers/slimStripeWebhook*.mjs` | L-89B proof |
| `server/src/payment/*` | Phase-1 money path |
| `server/prisma/migrations/**` | Immutable |
| `server/src/services/reloadlyClient.js` | Provider boundary |
| L-89B staging env semantics | Narrow sandbox proof |
| `docs/audits/**` | Audit record |

### Must not reuse (without redesign)

| Asset | Reason |
|-------|--------|
| Phase-1 `PaymentCheckout` for taxi fares | Wrong domain model |
| Reloadly operator map / `911xxx` placeholders | Not taxi |
| `AP786_ALL_PASSES_INVESTOR_PROOF.md` narratives | Claim inflation |
| `probe-multi-region.json` | Misleading artifact |
| Personal Stripe bank linkage | R-007 — entity mismatch |
| Unmounted `softLaunchAdmin` route | Dead code — don't copy |

---

## Rollback plan

| Scenario | Action |
|----------|--------|
| Pivot code breaks CI | Revert pivot branch; `main` unchanged |
| Accidental legacy deploy | Redeploy last known good walat SHA (`f261d7f` family) |
| Feature flag leak | Kill `ZORA_SUPERAPP_ENABLED`; verify env on all tiers |
| Evidence contamination | Stop commits; do not amend Ap786; new evidence folder |
| Legal stop order | Halt all phases; legacy remains frozen |

**Legacy deploy path preserved:** `cd server && npm run deploy:staging:guard && npm run deploy:staging` — **not run during planning**.

---

## Required CI / test gates (implementation phases)

| Gate | Command / check | When |
|------|-----------------|------|
| Secrets | `npm run secrets:scan` | Every PR |
| Schema | `npm run db:validate` | Every PR |
| Unit tests | `npm test` with `TEST_DATABASE_URL` | Every PR |
| Integration | `npm run test:integration` | CI service containers |
| Taxi isolation | Custom lint: no taxi→reloadly import | Phase 4+ |
| Flag default test | Assert all `ZORA_*_ENABLED` false | Phase 4+ |
| NON_CLAIMS header | PR template checkbox | All pivot PRs |

**2026-07-07 note:** Local `npm test` failed without usable `DATABASE_URL` — CI remains source of truth until local fixed.

---

## Required security gates

| ID | Gate | Phase |
|----|------|-------|
| SEC-01 | Threat model approved | 3 |
| SEC-02 | RBAC matrix implemented + tested | 4 |
| SEC-03 | No auth bypass env on public hosts | 4 |
| SEC-04 | Admin dual-control for sensitive actions | 4 |
| SEC-05 | `secrets:scan` PASS | 4+ |
| SEC-06 | Pen test or structured review | Before any public pilot |

Addresses audit risks R-001–R-012 where applicable to new surface.

---

## Required compliance gates

| ID | Gate | Blocks |
|----|------|--------|
| LEG-01 | Entity formation proof (private index) | Public pilot |
| LEG-02 | Afghanistan taxi licensing opinion | Driver onboarding live |
| LEG-03 | Published ToS/Privacy (taxi-specific) | App store |
| LEG-04 | Sanctions / geo policy external review | Cross-border features |
| LEG-05 | Zora Card e-money opinion | Phase 5 |
| LEG-06 | Bank/EMI partner agreement | Card load/spend |
| LEG-07 | Insurance proof (transport) | Live passengers |

**Legacy L-90C chain continues in parallel** — not replaced by pivot.

---

## Operator approval checkpoints

| Checkpoint | Phase | Sign-off |
|------------|-------|----------|
| **PIVOT-CP-01** | 1 | Planning docs accepted; PLAN-ONLY CONDITIONAL GO |
| **PIVOT-CP-02** | 2 | Brand/legal clearance or documented blockers |
| **PIVOT-CP-03** | 3 | Taxi architecture + threat model approved |
| **PIVOT-CP-04** | 4 | Implementation authorized; staging only |
| **PIVOT-CP-05** | 4 | Controlled pilot (no marketing claim) |
| **PIVOT-CP-06** | 5 | Card placeholder UI only |
| **PIVOT-CP-07** | 6 | Food module authorized |

**No checkpoint implies global launch, investor readiness, or real money.**

---

## Reloadly / legacy money path

| Item | Plan |
|------|------|
| Reloadly ticket `46249867603` | Unchanged — parallel track for walat only |
| L-90B4 env provision | **Blocked** — do not couple to taxi |
| Zora-Walat staging checkout | Remains evidence system — not user-facing for taxi MVP |

---

## NON_CLAIMS

This migration plan does not authorize implementation, hiring, fundraising, app store submission, or operation of taxi or financial services.

---

*Safe migration plan only. No commits. No code changes.*
