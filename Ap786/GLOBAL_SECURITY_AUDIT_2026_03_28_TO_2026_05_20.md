# Global security audit — 2026-03-28 to 2026-05-20

**Date:** 2026-05-20  
**Scope:** Code, CI, Ap786 evidence, control plane (read-only validation)  
**Verdict:** **PARTIAL** — strong staging money-path controls; production and operator layers have open items  
**NO_FALSE_PASS_POLICY:** Enforced — see status column per row.

**Sanitization:** Enum/boolean/suffix/count only; no secrets or PII.

---

## Summary table

| ID | Control | Status | Severity | Blast radius | Evidence | Required fix | Applied now |
|----|---------|--------|----------|--------------|----------|--------------|-------------|
| S-01 | Webhook signature verification | **PASS** | CRITICAL | Money ledger | Unit/integration tests; invalid sig → 400 | Maintain on slim path changes | Deferred (monitor) |
| S-02 | Webhook-only PAID authority | **PASS** | CRITICAL | Fulfillment | `phase1StripeCheckoutSessionCompleted`, gate tests | None for staging | — |
| S-03 | Paid-before-fulfillment gate | **PASS** | CRITICAL | Provider spend | `phase1FulfillmentPaymentGate.js` | None | — |
| S-04 | Stripe test/live key separation | **PASS** (code) **WARN** (ops) | CRITICAL | Wrong-environment charge | Key classifier; zw-doctor invariant | Operator confirm Vercel env per Neon branch | Runbook only |
| S-05 | Secrets in git | **PASS** | CRITICAL | Credential leak | `secrets:scan` CI + Guard | Continue scan on PR | — |
| S-06 | Gitignore for operator tokens | **PASS** | HIGH | Session hijack | `server/.gitignore` staging locals | None | — |
| S-07 | Operator auth (staging) | **BLOCKED** | HIGH | Harness / diagnostics | LOGIN_HTTP 401; P0 rotation plan | Rotation execute after approval | **Deferred** |
| S-08 | Credential rotation execute gate | **PASS** (design) | HIGH | Account takeover | Approval phrase required | Execute when approved | **Forbidden** |
| S-09 | Unpaid fulfillment prevention | **PASS** (code) | CRITICAL | Free airtime | Gate + `UNPAID_FULFILLMENT_ATTEMPT` incident | Periodic status-check audits | — |
| S-10 | Duplicate webhook replay | **PASS** (staging) | HIGH | Double PAID/fulfill | L-4/L-5; idempotency PK | L-13 refund replay pending | **Deferred** |
| S-11 | Unmatched Stripe events | **PASS** (auto) | MEDIUM | Silent loss | L-7 tests; fast-ack handler | Optional live fixture replay | **Deferred** |
| S-12 | Rate limit / abuse | **PARTIAL** | MEDIUM | API abuse | Redis init paths; not full pen-test | Load/abuse test backlog | **Deferred** |
| S-13 | PII in logs | **PARTIAL** | MEDIUM | Compliance | Redact paths; some debug breadcrumbs | Gate debug logs | **Deferred** |
| S-14 | Customer-facing secret leakage | **PASS** (web top-up) **WARN** (routes) | MEDIUM | Trust | `publicRuntime` production messages | Fix `/success` `/cancel` dev copy | **Deferred** (frontend tranche) |
| S-15 | Security claim copy | **PASS** (post May-19) | LOW | Investor trust | FRONTEND_PRODUCTION_UX audit | Complete l10n; remove test strings | **Deferred** |
| S-16 | Deploy root (API vs Next) | **PASS** | HIGH | Total outage | assert-vercel-api-deploy-root | None | — |
| S-17 | DB branch governance | **WARN** | HIGH | Wrong DB | P0 Neon audit | Dashboard confirmation | **Deferred** |
| S-18 | CI Super-System Guard | **PASS** | MEDIUM | Regressions | Green on main post-merge | Keep intelligence wired | — |
| S-19 | Self-healing money mutation | **BLOCKED** (by design) | CRITICAL | Autonomous loss | `SELF_HEALING_APPLY_ALLOWED false` | Never enable without approval | — |
| S-20 | Production preflight | **PASS** (unit) | HIGH | Unsafe prod config | `productionDeploymentPreflight` tests | Run before any prod deploy | Runbook |
| S-21 | L-13 duplicate refund | **NOT_IMPLEMENTED** | HIGH | Double refund state | Checklist only | Execute under L-13 phrase | **Deferred** |
| S-22 | L-12 partial refund | **NOT_IMPLEMENTED** | MEDIUM | Partial mirror | Day 2 plan | Design + proof | **Deferred** |
| S-23 | Rollback safety | **PARTIAL** | MEDIUM | Bad deploy | Git revert; Vercel rollback manual | Document rollback drill | Runbook |
| S-24 | Admin/operator diagnostics | **PASS** (gated) | MEDIUM | Info leak | Owner email gate; harness modes | No execute in CI | — |

---

## Auth & operator access

- Staging operator harness: register/login/OTP/checkout/status-check/L11 modes.  
- **P-2 PASS** historical; current login **401** → treat harness as **BLOCKED** until rotation.  
- CLI concatenation guards tested (`stagingOperatorCliSafety`).

---

## Stripe & payment transitions

- State machine + webhook truth layer documented in prior global audit.  
- Negative paths L-8 decline, L-9 cancel, L-10 expire: **PASS** staging/automated.  
- Refund: L-11 **PASS** once; no second refund in proof.

---

## Frontend & API error surfaces

- Web: investor-safe Stripe errors in production build.  
- Gap: hardcoded success/cancel pages (see `FRONTEND_INVESTOR_GRADE_UPGRADE_PLAN.md`).  
- Flutter: `walletTopUpHint` still references integration testing in EN ARB.

---

## CI coverage

| Check | Status |
|-------|--------|
| `ci.yml` Phase 1 money-path | **PASS** on main (attested) |
| `super-system-guard.yml` | **PASS** |
| Full Flutter CI | **PASS** (attested) |
| Live Stripe in CI | **NOT_RUN** (by design) |

---

## Fixes applied in this audit tranche

| Fix | Type |
|-----|------|
| New audit documents + index updates | Docs only |
| No code/infra mutation | — |

---

## Related

- `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md`  
- `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md`  
- `PROJECT_MEMORY_ZORA_WALAT_MASTER.md`
