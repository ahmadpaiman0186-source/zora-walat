# Super-System Intelligent Application Audit

**Date:** 2026-05-20  
**Branch:** `fix/post-l40-slim-stripe-webhook-invalid-signature`  
**HEAD at audit:** `1d9b614` (prior evidence); implementation extends control plane  
**Sanitization:** No secrets, env values, DATABASE_URL, JWTs, API keys, PII, full Stripe IDs, or raw webhook payloads.

---

## CURRENT_STATUS

| Dimension | Verdict | Honest summary |
|-----------|---------|----------------|
| **Staging money-path (L-1…L-11)** | **PASS (evidence-backed)** | Checkout → webhook → fulfill; L-11 refund once; duplicate webhook resend proof |
| **Global production platform** | **PARTIAL** | Weighted readiness ~**68%** — not live-certified |
| **Super-System control plane** | **PARTIAL → improving** | zw-doctor + incidents + **intelligence** mode (read-only synthesis) |
| **Self-healing apply** | **BLOCKED by design** | `ZW_SELF_HEALING_APPLY` default off; approval required |
| **Operator auth** | **BLOCKED locally** | Login 401; rotation tooling ready; dry-run blocked without gitignored env |
| **L-12 / L-13** | **NOT PASS** | L-13 checklist only |
| **NO_FALSE_PASS_POLICY** | **ENFORCED** | Partial/blocked states recorded explicitly in Ap786 |

---

## CRITICAL_RISKS

| ID | Risk | Severity | Mitigation in repo |
|----|------|----------|------------------|
| C-1 | Unattended money repair | CRITICAL | zw-doctor / incidents forbid auto-exec; approval workflow |
| C-2 | Wrong Vercel deploy root (Next on API host) | HIGH | `assert-vercel-api-deploy-root.mjs`; zw-doctor invariant |
| C-3 | Live Stripe key in staging | CRITICAL | Key classifier; `NO_LIVE_KEY_IN_TEST_CONTEXT` |
| C-4 | Committed secrets | CRITICAL | `secrets:scan`; CI super-system guard |
| C-5 | Operator credential compromise | HIGH | Rotation plan + guarded workflow; execute not run |
| C-6 | Neon branch / staging DB ambiguity | MEDIUM | P0 governance audit; dashboard confirmation pending |

---

## MONEY_PATH_RISKS

| Area | Status | Evidence / code |
|------|--------|-----------------|
| PAID authority | **Strong** | Webhook-only to PAID; `paymentStateMachine.js`, `phase1StripeCheckoutSessionCompleted.js` |
| Paid-before-fulfill gate | **Strong** | `phase1FulfillmentPaymentGate.js`; tests |
| Webhook idempotency | **Strong** | `StripeWebhookEvent` PK; P2002 duplicate ignore; chaos tests |
| Duplicate fulfillment | **Staging PASS** | L-5; operator enums |
| Refund mirror | **L-11 PASS** | `charge.refunded` slim path; incident REFUNDED |
| Duplicate refund event | **NOT EXECUTED** | L-13 checklist only |
| Unpaid/cancel/decline fulfill | **PASS** | L-8/L-9/L-10 |
| Partial refund (L-12) | **PENDING** | Not in evidence index as PASS |
| Self-healing money apply | **OFF** | `ZW_SELF_HEALING_APPLY` requires explicit enable |

---

## AUTH_RISKS

| Area | Status | Notes |
|------|--------|-------|
| Staging operator login | **BLOCKED** | 401 invalid_credentials; P0 rotation plan |
| Owner-only gate | **Implemented** | 403 when `OWNER_ALLOWED_EMAIL` mismatch |
| JWT in harness | **Gitignored** | `.staging-token.local` |
| Credential rotation execute | **FORBIDDEN** | Until separate approval; tooling at `b460789` |
| Dry-run | **BLOCKED (local)** | Missing gitignored `STAGING_OPERATOR_EMAIL` — not tooling failure |

---

## DEPLOYMENT_RISKS

| Area | Status | Notes |
|------|--------|-------|
| Deploy root guard | **Implemented** | `server/` only; CI + smoke |
| Slim serverless paths | **Implemented** | auth, webhook, ready, operator ops |
| HTML 404 API surface | **Detectable** | `stagingOperatorRouteDiagnostics.mjs` |
| Cold-start timeout | **Detectable** | Login/status-check timeouts classified |
| Auto failover to other DB/env | **FORBIDDEN** | No silent env switching |

---

## OBSERVABILITY_GAPS

| Gap | Priority | Notes |
|-----|----------|-------|
| Unified intelligence CLI | **P1 — addressed** | `zw-doctor intelligence` mode added (read-only) |
| Production SLO dashboard | P2 | Metrics exist; investor dashboard incomplete |
| Full `test:ci` re-run on every audit | P1 | Last global audit did not re-run full CI |
| webTopup integration in default CI | P2 | Several files exist but omitted from `test:integration` |
| Runtime frontend CTA validator | P2 | zw-doctor invariant; not in-app probe |
| Neon branch label in zw-doctor | P3 | Proposed `ZW_NEON_BRANCH_LABEL` only in governance doc |

---

## SELF_HEALING_GAPS

| Capability | Status |
|------------|--------|
| Drift scan | Implemented (`selfHealingRunner.js`, `moneyPathDriftScan.js`) |
| Apply repairs | **Gated** — `ZW_SELF_HEALING_APPLY=true` + ops approval |
| Auto DB/env mutation | **Forbidden** |
| zw-doctor proposals | Propose-only |
| Incident auto-close | **Not implemented** |

---

## REQUIRED_NEXT_ACTIONS

### P0 — Safety blockers (human)

1. Configure gitignored operator env per `P0_OPERATOR_LOCAL_CONFIG_GUIDE.md`.
2. Re-run `credential-rotation-dry-run` → target `DRY_RUN_VERDICT PASS`.
3. Confirm Neon/Vercel staging DB mapping per `P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md`.
4. Do **not** run credential-rotation-execute without separate approval.

### P1 — Auto-diagnostics (engineering)

1. Run `npm run zw:doctor -- intelligence --ci-static` in CI (optional next PR).
2. Keep super-system-guard on every PR.
3. Re-run full `test:ci` when `TEST_DATABASE_URL` available.

### P2 — Failover / self-healing readiness

1. Document rollback playbooks only — no auto switch.
2. Expand error classification coverage in customer routes (safe copy already partial).

### P3 — Investor / market

1. Execute L-13 only under approval after L-11 stable on confirmed DB branch.
2. Refresh `AP786_ALL_PASSES_INVESTOR_PROOF.md` after each tranche — honest partials.

### P4 — Market readiness

1. Production live Stripe rehearsal (separate program).
2. DR / backup drill (runbook exists; execution pending).

---

## PHASED IMPLEMENTATION PLAN

### P0 — Safety blockers (now)

- Fail-closed money path (existing).
- No auto money repair.
- Operator credential rotation guarded; execute locked.
- CI secrets scan + zw-doctor strict.

### P1 — Auto-diagnostics (this tranche)

- **Added:** `server/tools/zwDoctor/superSystemIntelligence.mjs`
- **Added:** `zw-doctor intelligence` mode — category synthesis, no mutations
- Incident classifier in CI (`incidents --strict --ci-static`)
- Route/deploy/stripe/operator diagnostics (existing harness)

### P2 — Self-healing / failover readiness (future, guarded)

- Drift scan on schedule (operator-triggered).
- Apply path remains behind `ZW_SELF_HEALING_APPLY` + written approval.
- No autonomous Neon/Vercel/DB cutover.

### P3 — Investor-grade UX and evidence (ongoing)

- Ap786 sanitized proofs; suffix-only IDs.
- Frontend production copy (`FRONTEND_PRODUCTION_UX_AUDIT_2026_05_19.md`).

### P4 — Market readiness (not claimed)

- Live money, scale, compliance — **out of scope** for current PASS claims.

---

## AUTOMATIC FAILURE DETECTION (inventory)

| Layer | Mechanism | Auto-fix? |
|-------|-----------|-----------|
| Liveness | `/api/health` slim | No |
| Readiness | `/api/ready` DB probe | No |
| Deploy | `deploy:staging:guard` | No |
| Money invariants | zw-doctor money-path | Propose only |
| Incidents | zw-doctor incidents | Propose only |
| Intelligence | zw-doctor intelligence | **Read-only synthesis** |
| Staging smoke | `zw:smoke:staging` | No |
| Operator | `staging-auth-checkout-operator` | No |
| CI guard | `super-system-guard.yml` | Blocks PR |

---

## ERROR CLASSIFICATION (platform)

Categories supported in `superSystemIntelligence.mjs`:

`auth` · `db` · `stripe` · `webhook` · `fulfillment` · `frontend` · `config` · `deploy_root` · `secret` · `operator` · `unknown`

Customer-facing errors: production-safe copy in web/mobile (`0f2c4e0`).  
Operator-facing: enum-only via harness and zw-doctor.

---

## NO_FALSE_PASS_POLICY

- **L-13** is checklist only — never marked PASS without executed proof.
- **Dry-run BLOCKED** is documented as env gap, not tooling pass.
- **Global 68%** does not imply production go-live.
- **intelligence mode** reports `WARN`/`DEGRADED`/`CRITICAL` honestly from invariants.
- This audit session: **no DB mutation**, **no payment/refund/webhook resend**, **no credential execute**.

---

## Implementation note (2026-05-20)

| Item | Value |
|------|--------|
| Module | `server/tools/zwDoctor/superSystemIntelligence.mjs` |
| CLI | `npm run zw:doctor -- intelligence [--json] [--strict] [--ci-static]` |
| Tests | `server/test/superSystemIntelligence.test.js` |
| DB mutation this tranche | **false** |
| Credential execute | **false** |

---

## CI repair note (2026-05-20)

| Field | Value |
|-------|--------|
| **Failure** | Super-System Guard — `ReferenceError: runZwDoctorIntelligence is not defined` at `zw-doctor.mjs` |
| **Root cause** | `runZwDoctorIntelligence` implemented and used in CLI but **not imported** in `server/tools/zw-doctor.mjs` |
| **Fix** | Import + re-export from `zwDoctor/run.mjs`; CLI wiring test added |
| **DB/env/payment/refund/webhook mutation** | **false** |
| **Secrets scan** | **pass** (post-fix) |
| **MONEY_MUTATION_EXECUTED** | **false** |
| **SELF_HEALING_APPLY_ALLOWED** | **false** |

---

## Related evidence

- `SUPER_SYSTEM_GLOBAL_ENGINEERING_AUDIT_2026_03_28_TO_2026_05_19.md`
- `SUPER_SYSTEM_CONTROL_PLANE_ARCHITECTURE.md`
- `SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md`
- `P0_OPERATOR_AUTH_CREDENTIAL_ROTATION_PLAN.md`
- `P0_OPERATOR_LOCAL_CONFIG_GUIDE.md`
