# ZORA PIVOT DECISION — 2026-07-07

## Audit Standard (preserved)

ZORA-WALAT GLOBAL REAL-PROOF ENGINEERING STANDARD  
BUSINESS SUPER-SYSTEM ENGINEERING STANDARD  
NO GLOBAL LAUNCH, NO MONEY CLAIM, NO PROVIDER CLAIM, NO MARKET CLAIM, NO INVESTOR CLAIM WITHOUT DIRECT REAL-WORLD PROOF

**Source audit:** `docs/audits/ZORA_WALAT_MASTER_CHECK_2026_07_07.md` (branch `audit/zora-walat-master-check-2026-07-07`)  
**Planning branch:** `plan/zora-pivot-from-audit-2026-07-07`  
**Mode:** PLAN ONLY — no implementation authorized by this document

---

## Executive decision

Zora-Walat remains a **frozen legacy engineering and evidence system**. A future **Afghanistan-focused super-app** may be planned under the master brand candidate **Zora**, with **taxi/ride** as the first contemplated business module, only after legal, security, and operator gates — not as a rename or merge of the current money-path product in place.

**Planning verdict for this document:** **PLAN-ONLY CONDITIONAL GO**  
**Implementation verdict:** **NO-GO** — no code, deploy, payment, provider, or market activation is authorized.

---

## Keep Zora-Walat as legacy?

**YES — mandatory.**

| Decision | Rationale |
|----------|-----------|
| Retain all `server/`, `lib/`, `Ap786/` as-is | L-85M, L-86D, L-89B evidence chains; 41 Prisma migrations; ~248 tests |
| No deletion pre-pivot | Audit: `ZORA_WALAT_REUSE_OR_FREEZE_DECISION_2026_07_07.md` §2 |
| No in-place rebrand of Zora-Walat code to Zora | Avoids contaminating proven narrow gates with unproven super-app claims |
| Legacy name stays on existing routes, env, Vercel projects | `zora-walat-api-staging`, Phase-1 checkout, Reloadly scaffolding |

Zora-Walat is **not** sunset; it is **quarantined** as a reference implementation for payment discipline, webhook idempotency, and evidence hygiene.

---

## Use Zora as future master brand?

**YES — as planning candidate only; not proven or launched.**

| Aspect | Decision |
|--------|----------|
| Master consumer brand | **Zora** (candidate) for Afghanistan super-app |
| Product scope | Multi-module **planning** horizon: taxi first, then food/grocery/top-up/bills |
| Code/repo rename | **NOT ALLOWED** in planning phase |
| Trademark / name clearance | **NOT PROVEN** — requires `L-90C1A1-OFFICIAL-NAME-CLEARANCE-READONLY` before any filing |
| Conflict with Zora-Walat | Resolved by **namespace separation**: legacy repo paths vs future `zora-*` modules (see architecture doc) |

**Zora** must not appear in production code, package names, or deploy targets until a separate **brand + legal approval gate** passes.

---

## ZoraXpress — primary brand or service label?

**Avoid as primary master brand. Optional service label only after counsel review.**

| Option | Recommendation |
|--------|----------------|
| Primary app brand | **Avoid** — splits brand equity; audit shows no filed trademark proof for either name |
| Sub-brand / line label | **Conditional** — e.g. "Zora Taxi" or historical "ZoraXpress Rides" only if name clearance and local Dari/Pashto review pass |
| Technical identifier | **Avoid in code** until implementation gate; use neutral module IDs (`taxi`, `dispatch`) in plans |
| Marketing coexistence | If operator retains ZoraXpress verbally, document as **legacy spoken name** only — not in investor or store listings without clearance |

**Default planning stance:** **Zora** = master brand; **ZoraXpress** = deprecated or secondary label unless operator supplies external trademark evidence.

---

## Product scope decision (planning horizon)

### In scope for planning (documentation only)

1. **Taxi / ride** — first module architecture, RBAC, audit, cash tracking (no live payments)
2. **Auth, users, driver/vehicle onboarding** — patterns reused from existing JWT/OTP discipline
3. **Admin control tower, support, complaints** — ops model
4. **Zora Card** — **prepaid balance placeholder only**, disabled, not credit, not EMI
5. **Placeholders (disabled):** mobile top-up, bills, food delivery phase 2

### Out of scope until separate gates

| Item | Status |
|------|--------|
| Live Stripe / card acquiring | **BLOCKED** — `REAL_MONEY_PASS=NO` |
| Reloadly / airtime live fulfillment | **BLOCKED** — `PROVIDER_PASS=NO`, ticket `46249867603` |
| Wallet cash-in / cash-out | **BLOCKED** — money-transmission analysis not started |
| Food / grocery implementation | **Phase 6 planning reference only** |
| Afghanistan taxi regulatory licensing | **UNKNOWN** — requires local counsel |
| Public app store launch | **NO-GO** |

### Strict activation rule

**No wallet, card, cash-in, cash-out, top-up, or bill-payment live activation** without:

- Registered legal entity (`REGISTERED_LEGAL_ENTITY_EXISTS=false` today)
- Business bank + aligned Stripe/profile (personal bank today — R-007)
- Counsel deliverables (L-90C chain)
- Provider/bank contracts where applicable
- Explicit operator authorization gate per module

---

## What is allowed in planning

- Architecture and migration **documents** under `docs/pivot/`
- Module boundaries, feature-flag **specifications** (not code)
- RBAC matrices, audit event catalogs, test-plan outlines
- Reuse maps referencing audit files
- Brand/legal **questionnaires** (L-90C1A continuation)
- Operator approval checkpoint definitions
- NON_CLAIMS banners on all pivot docs

---

## What is not allowed

- Any change to `server/`, `lib/`, `api/`, `Ap786/`, package files, CI, or Vercel config
- Renaming product in code or UI
- Deleting legacy Zora-Walat code or evidence
- Adding taxi, card, food, or grocery **implementation**
- Enabling payment, provider HTTP, webhooks, or env mutation
- Touching untracked `Ap786/evidence/L87A*` folders
- Investor decks, revenue claims, "launch ready", "provider integrated"
- Merging taxi dispatch with Phase-1 `PaymentCheckout` / Reloadly paths without a dedicated integration gate

---

## Claim lock policy

All pivot communications and future docs must inherit audit locks:

```
GLOBAL_LAUNCH_PASS=NO
REAL_MONEY_PASS=NO
PROVIDER_PASS=NO
COMPLIANCE_PASS=NO
MARKET_PASS=NO
INVESTOR_READY=NO
GLOBAL_REAL_BUSINESS_PROOF=12%_UNCHANGED
```

| Claim type | Policy |
|------------|--------|
| Engineering reuse | **CONDITIONAL GO** — cite audit file + module path |
| Staging sandbox payment | **Narrow scope only** — L-89B; not Zora taxi |
| Production | **DB-readonly proof only** — L-86D scoped |
| "Super-app live" | **FORBIDDEN** without per-module proof |
| Zora Card "available" | **FORBIDDEN** until bank/EMI/legal gate |

New pivot docs must include a **NON_CLAIMS** section mirroring `Ap786/evidence/*/NON_CLAIMS.md` pattern.

---

## Legal / compliance warning

This pivot plan is **not legal advice**. Audit findings (L-90C, L-90C1A) establish:

- **No registered legal entity** (operator-confirmed)
- **No published ToS/Privacy** with legal review
- **No money-transmission licensing analysis**
- **Sanctions controls = code only** — external review not started
- **Personal Stripe bank** — not entity-aligned

**Taxi operations in Afghanistan** may require transport licensing, driver vetting, insurance, tax registration, and data-protection compliance beyond anything proven in Zora-Walat. **Zora Card prepaid** may trigger e-money, payment institution, or banking partner rules — **disabled until counsel + bank approve**.

Do not interpret planning approval as permission to operate, solicit drivers, or accept fares.

---

## Relationship to audit verdicts

| Dimension | Audit verdict | Pivot stance |
|-----------|---------------|--------------|
| Overall business launch | **NO-GO** | Unchanged |
| Engineering asset reuse | **CONDITIONAL GO** | Reuse patterns only; new modules greenfield |
| Security | **NO-GO** | New RBAC/audit required before taxi code |
| Payment / Provider | **NO-GO** | Legacy frozen; no activation in pivot phases 0–3 |
| Compliance | **NO-GO** | Phase 2 brand/legal before implementation |

---

## Final decision

| Question | Answer |
|----------|--------|
| Proceed with **planning** for Zora Afghanistan super-app (taxi-first)? | **PLAN-ONLY CONDITIONAL GO** |
| Proceed with **implementation**? | **NO-GO** |
| Rename or replace Zora-Walat in repo now? | **NO-GO** |
| Activate money/provider modules? | **NO-GO** |

**Next planning artifact:** `ZORA_TARGET_ARCHITECTURE_2026_07_07.md`, `ZORA_SAFE_MIGRATION_PLAN_2026_07_07.md`

---

*Plan-only. No code modified. No secrets. No launch claim.*
