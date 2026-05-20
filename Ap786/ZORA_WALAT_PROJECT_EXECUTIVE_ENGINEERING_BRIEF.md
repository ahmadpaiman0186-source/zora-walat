# Zora-Walat — Executive Engineering Brief

**Audience:** Founders, investors, engineering leads, operators, and AI agents continuing the program  
**Evidence window:** 2026-03-28 → 2026-05-20  
**Primary sources:** Ap786 audit pack (see §16)  
**Sanitization:** Enum-only, boolean-only, suffix-only, count-only evidence — no secrets, env values, tokens, or PII  
**Authoring context:** Produced from existing repo evidence only; no application code changes and no dangerous operations in this tranche.

---

## 1. Executive Summary

Zora-Walat is an international mobile top-up platform in active engineering toward a **Super-System Intelligent Production Platform**: it is designed to detect failures, classify errors, protect payment and fulfillment paths, and produce sanitized audit evidence rather than overclaim readiness.

As of 2026-05-20, the program shows **strong staging discipline** for Phase 1 money movement (checkout → webhook-confirmed payment → fulfillment) with documented proofs through **L-11**, a merged control-plane release (**PR #21**), and green CI / Super-System Guard on `main` per operator attestation. The platform is **not production-ready** for live-money launch, full global scale, or unattended autonomous repair.

**Current readiness:** **68% PARTIAL** (weighted estimate documented in `GLOBAL_ENGINEERING_HEALTH_REPORT_2026_05_20.md`).

The active documentation branch `audit/global-super-system-health-2026-05-20` contains **docs and evidence only**. No database mutation, no Vercel/Neon environment change, no payments, refunds, webhook resends, credential rotation execute, or deploy occurred in authoring this brief.

**Safest near-term move:** Merge the audit docs-only pull request to `main`, then implement **Frontend Phase A** on a scoped feature branch — still without money-path or infrastructure mutations unless separately approved.

---

## 2. Product Overview

### What Zora-Walat is

Zora-Walat (`zora_walat`) enables **international mobile top-up** (airtime, data, and related telecom products) for diaspora communities and travelers. Customers select destination operator, product, and amount; pay via **Stripe-hosted Checkout** in USD; and receive fulfillment after the **server** confirms payment — not when the browser alone says success.

*Source: `ZORA_WALAT_REBOOT_BRIEF_FOR_CHATGPT_AND_AGENT.md` §1; `AP786_ALL_PASSES_INVESTOR_PROOF.md`.*

### Business and user value (evidenced scope)

| Value | Status |
|-------|--------|
| Cross-border top-up with familiar card checkout | **Proven on staging** (test mode) |
| Payment verified before operator fulfillment starts | **Proven** (code + L-1…L-11 evidence) |
| Duplicate-safe webhook and fulfillment behavior | **Proven** on staging for L-4/L-5 scope |
| Multi-locale customer experience | **Partial** — web `en` strong; fa/ar/tr incomplete |
| Production live-money service | **Not proven yet** |

### Investor-facing direction (honest)

The Ap786 evidence system (`Ap786/`) provides **investor-readable, sanitized proof** of staging behavior. That narrative supports diligence and controlled demos; it does **not** substitute for production certification, compliance sign-off, or live Stripe/Reloadly scale proof.

*Source: `AP786_ALL_PASSES_INVESTOR_PROOF.md`; `README.md`.*

---

## 3. Current Repo / Branch State

| Item | Value |
|------|--------|
| **Documentation branch** | `audit/global-super-system-health-2026-05-20` |
| **Branch HEAD (latest)** | `17b2d1b86fca418e26318f6c375271eea6ec8808` |
| **Main base referenced** | `main` @ `ab5817d` — post-merge verification evidence (`PR21_POST_MERGE_VERIFICATION.md`) |
| **PR #21 merge on main** | `2ea64a2` — Super-System Guard, zw-doctor, incidents, intelligence, slim API paths, Ap786 pack |
| **Global audit pack commit** | `4b32db9a3429afc7a2075a656728cc133cdc28da` — security, money-path, health, gated ops docs |
| **Reboot / handoff commits** | `ddf46bddbcf3329fcdd0e254df51c638b1f0c31c`; `17b2d1b86fca418e26318f6c375271eea6ec8808` |
| **Branch nature** | **Docs/evidence only** — no application logic changes on this branch for the audit tranche |
| **Push status** | Audit branch pushed to `origin` (per program record through `17b2d1b`) |

### CI status on `main` (operator attestation — not re-run in this brief session)

| Check | Status |
|-------|--------|
| CI server | **Green** |
| CI flutter | **Green** |
| Super-System Guard | **Green** |
| Phase 1 money-path integrity (CI workflow) | **PASS** |

*Source: `PR21_POST_MERGE_VERIFICATION.md`.*

---

## 4. Architecture Summary

High-level architecture **as evidenced** in Ap786 and project memory documents:

| Layer | Description | Evidence |
|-------|-------------|----------|
| **Web frontend** | Next.js: `app/`, `components/topup/`, `messages/` — main top-up, history, Stripe return routes | `PROJECT_MEMORY_ZORA_WALAT_MASTER.md` §3.1 |
| **Mobile** | Flutter: telecom checkout, recharge, `lib/l10n/` ARB localizations | Same |
| **API / server** | Vercel serverless slim handlers under `server/api/`; Express domain under `server/src/` | Same |
| **Money path** | Checkout → Stripe → webhook PAID → `phase1FulfillmentPaymentGate` → queue/worker → fulfilled | `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md` |
| **Stripe** | Hosted Checkout + webhook handlers (`checkout.session.completed`, `charge.refunded` slim paths); staging proofs in **test mode** | L-11 evidence; investor proof |
| **Database** | Neon Postgres + Prisma (`server/prisma/`) — connection strings **not** in docs | `P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md` (branch name only) |
| **Queue** | BullMQ/Redis Phase 1 fulfillment (evidenced in architecture audits) | `PROJECT_MEMORY_ZORA_WALAT_MASTER.md` |
| **CI** | `ci.yml`, `super-system-guard.yml`, `nightly-fortress.yml` | `README.md`; reboot brief |
| **Super-System diagnostics** | `zw-doctor` CLI, incident taxonomy, intelligence synthesis | `SUPER_SYSTEM_FAILURE_DETECTION_AND_AUTO_REPAIR_REPORT.md` |
| **Evidence** | `Ap786/` sanitized markdown index | `AP786_EVIDENCE_INDEX.txt` |

**Deploy root:** API deploy root is `server/` with Vercel guard scripts (evidenced in security audit — deploy root invariant).

---

## 5. Super-System Safety Model

Zora-Walat targets **fail-closed** behavior on payment ambiguity: client return URLs and UI state do not authorize fulfillment.

| Principle | Implementation (evidenced) |
|-----------|----------------------------|
| **No pay, no service** | `canOrderProceedToFulfillment` blocks unpaid/terminal/incident-blocked orders |
| **Zero duplicate transaction (target)** | Webhook event idempotency; L-4/L-5 resend proof |
| **Zero duplicate fulfillment (target)** | Gate + counters; duplicate fulfillment incident type |
| **Incident detection** | `zw-doctor incidents` — 21 incident types, propose-only |
| **Error classification** | `zw-doctor intelligence` — read-only synthesis |
| **CI guard** | Super-System Guard — secrets scan + static zw-doctor + unit tests |
| **Self-healing** | Code exists; **apply disabled by policy** |

### Read-only control-plane signals (post-merge attestation)

| Signal | Value | Source |
|--------|--------|--------|
| `SELF_HEALING_APPLY_ALLOWED` | **false** | `PR21_POST_MERGE_VERIFICATION.md` |
| `ACTIVE_INCIDENT_COUNT` | **0** | Same |
| `ACTIVE_MONEY_INCIDENT_COUNT` | **0** | Same |
| `FAIL_CLOSED_MONEY_PATH` | **true** | Same |
| `incident_verdict` (incidents ci-static) | **PASS** | Same |
| `MONEY_MUTATION_EXECUTED` | **false** | Same |

**Not fully enabled yet:** Production APM at scale, autonomous infra failover, and self-healing apply that mutates money or environment state.

*Source: `SUPER_SYSTEM_FAILURE_DETECTION_AND_AUTO_REPAIR_REPORT.md`.*

---

## 6. Money Path Status

| Area | Verdict | Notes |
|------|---------|-------|
| **Staging L-1 through L-11** | **PASS** | Documented in `AP786_EVIDENCE_INDEX.txt` and investor proof |
| **Global money path** | **PARTIAL** | Strong staging; production live-money not claimed |
| **Production live-money** | **Not claimed** | Explicit non-claim across audit pack |
| **L-12 partial refund** | **Pending** | Not implemented |
| **L-13 duplicate refund event** | **Not executed** | Checklist only — **NOT PASS** |

**Audit branch operations:** No payment, refund, or webhook resend occurred in the audit/documentation tranche.

*Sources: `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md`; `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md`.*

---

## 7. Security Status

| Item | Status | Source |
|------|--------|--------|
| **Overall security verdict** | **PARTIAL** | `GLOBAL_SECURITY_AUDIT_2026_03_28_TO_2026_05_20.md` |
| **Secrets scan (tracked sources)** | **OK** | Health report; validation §9 |
| **Webhook signature verification** | **PASS** (code/tests) | Security audit S-01 |
| **Credential rotation execute** | **Forbidden** without approval | `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md` G-01 |
| **Operator staging login** | **BLOCKED** (401) | `P0_OPERATOR_AUTH_CREDENTIAL_ROTATION_PLAN.md` |
| **Vercel/Neon dashboard alignment** | **Operator-required** | Neon governance audit; blockers list |
| **Production security gaps** | **Open** | Live keys, scale abuse testing, full DR — not proven |

No secrets, DATABASE_URL, or credentials appear in this document.

---

## 8. Frontend / Investor Readiness

| Item | Status |
|------|--------|
| **Frontend investor-grade (overall)** | **NOT PASS** |
| **Web top-up (`ZoraWalatTopUp`)** | **Improved** — CTA guards, trust copy, staging badge when env set |
| **`/success` and `/cancel` routes** | **Gap** — hardcoded English / developer-oriented copy |
| **Full i18n (fa, ar, tr)** | **Incomplete** — scaffolded from English |

**Recommended next safe implementation track:** **Frontend Phase A** on branch `feat/frontend-phase-a-investor-grade` — scope limited to success/cancel pages, wallet hint copy, and customer-safe i18n. No DB, env, payment, or deploy.

*Sources: `ZORA_WALAT_REBOOT_BRIEF_FOR_CHATGPT_AND_AGENT.md` §7, §10C; `FRONTEND_PRODUCTION_UX_AUDIT_2026_05_19.md`.*

---

## 9. Validation Evidence

Validation performed in the global audit / reboot program (read-only where applicable):

| Check | Result |
|-------|--------|
| `npm run secrets:scan` | **OK** — no high-confidence live-secret patterns in tracked sources |
| `git diff --check` | **clean** |
| `npm run zw:doctor -- intelligence --ci-static` | **exit 0** — `ZW_INTELLIGENCE_VERDICT` **WARN** (static profile category review; not a money incident) |
| `MONEY_MUTATION_EXECUTED` | **false** |
| `ACTIVE_INCIDENT_COUNT` | **0** |
| `ACTIVE_MONEY_INCIDENT_COUNT` | **0** |
| `FAIL_CLOSED_MONEY_PATH` | **true** |
| `SELF_HEALING_APPLY_ALLOWED` | **false** |
| `npm run zw:doctor -- incidents --ci-static` | **exit 0** — `incident_verdict` **PASS** (per `PR21_POST_MERGE_VERIFICATION.md`) |

*Sources: `GLOBAL_ENGINEERING_HEALTH_REPORT_2026_05_20.md` §7; `PR21_POST_MERGE_VERIFICATION.md`.*

---

## 10. Remaining Blockers

1. **Credential rotation execute** — forbidden without separate approval; tooling exists; execute not run.  
2. **L-13 duplicate refund proof** — not executed; checklist only.  
3. **L-12 partial refund** — pending; not implemented.  
4. **Production live-money** — not claimed.  
5. **Frontend investor routes + full i18n** — NOT PASS (`/success`, `/cancel`, locales).  
6. **Neon/Vercel dashboard final confirmation** — operator-required.  
7. **Intelligence WARN on static profile** — review category signals; **not** a money incident (`ACTIVE_MONEY_INCIDENT_COUNT` **0**).

*Source: `ZORA_WALAT_REBOOT_BRIEF_FOR_CHATGPT_AND_AGENT.md` §9.*

---

## 11. Approved Next Tracks

Four continuation tracks — operator or engineering lead selects one per sprint.

### Track 1 — Frontend Phase A

| Field | Detail |
|-------|--------|
| **Objective** | Investor-safe Stripe return pages and customer copy |
| **Allowed** | Edit `app/success/page.tsx`, `app/cancel/page.tsx`, `messages/*`, Flutter wallet hint ARB; tests |
| **Forbidden** | DB, env, payment, refund, webhook, deploy, credential execute |
| **Expected output** | PR with locale-aware, production-safe copy; Ap786 note when reviewed |
| **Risk level** | **Low** |
| **Rollback** | Git revert UI-only commit |

### Track 2 — Credential rotation approval

| Field | Detail |
|-------|--------|
| **Objective** | Restore staging operator harness login after exposure event |
| **Allowed** | diagnose, plan, dry-run; local gitignored config per `P0_OPERATOR_LOCAL_CONFIG_GUIDE.md` |
| **Forbidden** | Agents setting `STAGING_OPERATOR_ROTATION_APPROVAL`; execute without human |
| **Expected output** | dry-run PASS → single approved execute → enum-only login/status evidence |
| **Risk level** | **Medium** (account access) |
| **Rollback** | Rotation runbook; no DB reset without separate approval |

### Track 3 — L-13 proof

| Field | Detail |
|-------|--------|
| **Objective** | Prove duplicate `charge.refunded` does not corrupt state |
| **Allowed** | Staging test-mode resend with written approval phrase; before/after status-check |
| **Forbidden** | CI/automated webhook resend; production |
| **Expected output** | Ap786 L-13 evidence doc — **only then** mark L-13 PASS |
| **Risk level** | **Medium** (refund state) |
| **Rollback** | Documented in `L13_DUPLICATE_REFUND_EVENT_SAFETY_CHECKLIST.md` |

### Track 4 — Readiness review

| Field | Detail |
|-------|--------|
| **Objective** | Re-score readiness after merges; no money mutations |
| **Allowed** | Read-only zw-doctor, `secrets:scan`, doc updates, CI review |
| **Forbidden** | False PASS claims; inflating percentage without new proofs |
| **Expected output** | Updated health report with honest weighted score |
| **Risk level** | **Low** |
| **Rollback** | N/A (read-only) |

*Source: `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md`; reboot brief §10–11.*

---

## 12. Exact Next Safe Recommendation

1. Open a **docs-only** pull request: `audit/global-super-system-health-2026-05-20` → `main` (includes this brief, audit pack, reboot handoff).  
2. Merge **only after** green CI and Super-System Guard on the PR.  
3. Optionally merge `chore/composer-frontend-investor-plan` docs if not already on `main`.  
4. Create `feat/frontend-phase-a-investor-grade` from updated `main`.  
5. Implement **`/success` and `/cancel`** (and scoped i18n/wallet copy) only.  
6. Do **not** perform DB, env, payment, refund, webhook, or credential operations without explicit approval.

---

## 13. Risk Register

| Risk | Severity | Current status | Required owner / action |
|------|----------|----------------|-------------------------|
| Production live-money launch without certification | **Critical** | **Open** | Executive release gate; separate cert program |
| Unpaid fulfillment drift | **Critical** | **Controlled in code** | Periodic operator status-check; zw-doctor money-path |
| Duplicate webhook / fulfillment | **High** | **PASS staging L-4/L-5** | Maintain idempotency tests on webhook changes |
| L-13 duplicate refund event unproven | **High** | **Not executed** | Operator L-13 proof under approval |
| Credential compromise (staging operator) | **High** | **BLOCKED login** | Approved rotation execute |
| Wrong Neon branch / Vercel env | **High** | **Confirmation pending** | Operator dashboard verification |
| Frontend investor gap on return URLs | **Medium** | **Open** | Frontend Phase A |
| Incomplete i18n | **Medium** | **Open** | Phase B locale completion |
| Intelligence WARN categories | **Low** | **Review pending** | Engineering triage static signals |
| Production observability / APM | **Medium** | **Not proven yet** | Design suffix-only monitoring |
| Autonomous self-healing money apply | **Critical** | **Blocked by design** | Keep `SELF_HEALING_APPLY_ALLOWED` false |

*Sources: `GLOBAL_SECURITY_AUDIT_2026_03_28_TO_2026_05_20.md`; `GLOBAL_ENGINEERING_HEALTH_REPORT_2026_05_20.md`.*

---

## 14. Investor-Safe Claim Boundary

### Proven (staging, test mode, with Ap786 citations)

- End-to-end staging top-up to terminal fulfillment with duplicate-safe readouts (`AP786_ALL_PASSES_INVESTOR_PROOF.md`).  
- Duplicate `checkout.session.completed` resend does not change terminal enums (L-4/L-5).  
- Decline, cancel, and expired paths do not fulfill unpaid orders (L-8–L-10).  
- Single full refund with REFUNDED incident mirror (L-11).  
- `secrets:scan` clean on tracked sources; Super-System Guard green on `main` (post-merge attestation).  
- Read-only zw-doctor: zero active money incidents; fail-closed money path flag true (`PR21_POST_MERGE_VERIFICATION.md`).

### Partially proven

- Global engineering maturity at **~68%** weighted PARTIAL (`GLOBAL_ENGINEERING_HEALTH_REPORT_2026_05_20.md`).  
- Security posture PARTIAL — strong code gates; operator and production ops gaps open.  
- Web top-up UX and payment CTA safety (not entire frontend surface).  
- Automated L-6/L-7 tests; optional live staging fixture replay noted as gap in prior audits.  
- Control plane detect/classify; propose-only repair.

### Not proven yet

- Production live Stripe / Reloadly money at scale.  
- L-12 partial refund; L-13 duplicate refund event.  
- Credential rotation execute complete.  
- Frontend investor-grade overall PASS.  
- Full production observability, DR drill, compliance sign-off.  
- Unattended autonomous money or infrastructure repair.

**Do not state:** “Production-ready,” “bank-grade,” “fully automated super-system,” or “all refunds/payments safe in production” without new executed evidence.

---

## 15. Final CTO Verdict

Zora-Walat has **mature audit discipline**, a **credible staging money-path story (L-1 through L-11)**, and a **merged Super-System control plane** (zw-doctor, incidents, intelligence, CI Guard) that fails closed on unattended money mutation. The engineering organization is operating with **honest partial readiness (68%)** rather than inflating status.

The platform is **not production-ready** for live-money general availability. Open items — operator credential rotation execute, L-13, L-12, frontend return routes, and Neon/Vercel operator confirmation — are correctly **gated**, not hidden.

**Recommended decision:** Approve **docs-only merge** of `audit/global-super-system-health-2026-05-20` to `main`, then fund **Frontend Phase A** as the next implementation slice. Defer all dangerous operations to explicit human approval per `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md`.

---

## 16. Source document index

| Document | Role |
|----------|------|
| `ZORA_WALAT_REBOOT_BRIEF_FOR_CHATGPT_AND_AGENT.md` | Agent/founder handoff |
| `PROJECT_MEMORY_ZORA_WALAT_MASTER.md` | Durable technical memory |
| `GLOBAL_ENGINEERING_HEALTH_REPORT_2026_05_20.md` | Readiness and roadmaps |
| `GLOBAL_SECURITY_AUDIT_2026_03_28_TO_2026_05_20.md` | Security PASS/WARN table |
| `SUPER_SYSTEM_FAILURE_DETECTION_AND_AUTO_REPAIR_REPORT.md` | Detect/repair boundaries |
| `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md` | Money path deep audit |
| `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md` | Deferred operations |
| `PR21_POST_MERGE_VERIFICATION.md` | Merge and CI attestation |
| `AP786_ALL_PASSES_INVESTOR_PROOF.md` | Investor summary |
| `AP786_EVIDENCE_INDEX.txt` | Evidence index |
| `README.md` | Ap786 folder guide |

---

*Document authored from repo evidence only. No forbidden operations performed.*
