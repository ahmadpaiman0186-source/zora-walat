# Zora-Walat — Project memory (master)

**Window:** 2026-03-28 → 2026-05-20  
**Audit branch:** `audit/global-super-system-health-2026-05-20`  
**Production line:** `main` @ merge `2ea64a2` (PR #21) + evidence `ab5817d`  
**Classification:** Super-System Intelligent Production Platform (target) · **current global readiness ~68% PARTIAL**  
**Sanitization:** No secrets, env values, DATABASE_URL, tokens, JWTs, Stripe keys, PII, or raw webhooks.

---

## 1. Current state (2026-05-20)

| Item | Value |
|------|--------|
| **main** | Green CI + Super-System Guard (post-merge attestation) |
| **Control plane** | `zw-doctor` summary, money-path, incidents, intelligence (read-only CI) |
| **Staging money-path L-1…L-11** | **PASS** (Ap786 evidence, test mode) |
| **L-12 / L-13** | **NOT PASS** / not executed |
| **Production live-money** | **Not claimed** |
| **Frontend investor-grade** | **NOT PASS** (top-up improved; `/success` `/cancel` gap) |
| **Operator auth** | **BLOCKED** (401); rotation execute forbidden |
| **Self-healing apply** | **OFF** (`ZW_SELF_HEALING_APPLY` gated) |

---

## 2. Key merge points & commits

| Commit | Milestone |
|--------|-----------|
| `7078e7f`+ | Prisma / canonical data checkpoint (late Mar) |
| `5798376` | Slim `checkout.session.completed` + `/success` |
| `014f666` | Fast operator status-check |
| `5d6fa2f` | Operator auth harness hardening |
| `866a26e` / L-4/L-5 | Duplicate webhook resend proof |
| `fcf928f` | L-6/L-7 automated tests |
| `f728047` / L-11 | Slim `charge.refunded` mirror |
| `079d633` / `1585d08` | zw-doctor + Super-System Guard |
| `2ea64a2` | **PR #21 merged** |
| `2c04d8b` | Intelligence CLI wiring fix |
| `ab5817d` | Post-merge verification evidence |

---

## 3. Repository architecture

### 3.1 Frontend (web)

| Path | Role |
|------|------|
| `app/` | Next.js routes: `/`, `/history`, `/success`, `/cancel` |
| `components/topup/` | `ZoraWalatTopUp`, payment UI, order history |
| `messages/` | i18n (`en`, `fa`, `ar`, `tr`) |
| `lib/env/publicRuntime.ts` | `NEXT_PUBLIC_*`, staging badge, Stripe key diagnostics |

### 3.2 Mobile (Flutter)

| Path | Role |
|------|------|
| `lib/features/telecom/` | Checkout, recharge, catalog |
| `lib/l10n/` | ARB localizations (EN, FA, PS, …) |
| `lib/services/payment_service.dart` | Checkout redirect, lockdown handling |

### 3.3 Server / API

| Path | Role |
|------|------|
| `server/api/` | Vercel serverless slim handlers (auth, checkout, webhook, operator) |
| `server/src/` | Express domain: payments, webhooks, fulfillment queue, gates |
| `server/prisma/` | Postgres schema + migrations |
| `server/tools/` | Operator harness, zw-doctor, staging smoke, credential rotation (gated) |

### 3.4 Evidence & CI

| Path | Role |
|------|------|
| `Ap786/` | Sanitized investor/operator evidence |
| `.github/workflows/ci.yml` | Server tests + Phase 1 money-path certification |
| `.github/workflows/super-system-guard.yml` | Static guard (no secrets/money ops) |
| `.github/workflows/nightly-fortress.yml` | Scheduled money-path stress (mock provider) |

---

## 4. Infrastructure overview

| Layer | Implementation | Notes |
|-------|----------------|-------|
| **API host** | Vercel serverless (`server/` deploy root) | `assert-vercel-api-deploy-root.mjs` |
| **Database** | Neon Postgres + Prisma | Staging branch governance doc; no delete in repo |
| **Payments** | Stripe Checkout (hosted) + webhooks | Test mode on staging proofs |
| **Queue** | BullMQ / Redis (fulfillment) | Phase 1 producer/worker |
| **Secrets** | Env vars (not in git); `secrets:scan` CI | `.env.local` gitignored |

---

## 5. Payment safety model

1. **Checkout** creates `PaymentCheckout` PENDING with idempotency.  
2. **Stripe webhook** (`checkout.session.completed`) is **only** authority to mark PAID (`PAYMENT_SUCCEEDED`).  
3. **`canOrderProceedToFulfillment`** blocks unpaid, wrong currency, terminal orders, incident blocks.  
4. **Fulfillment** idempotent via queue + duplicate-safe counters.  
5. **Refunds** mirror via `charge.refunded` slim path → incident REFUNDED (L-11 once).  
6. **Client return URLs** do not grant PAID — fail closed.

---

## 6. No-pay-no-service model

| State | Fulfillment | Customer UX |
|-------|-------------|---------------|
| PENDING / unpaid | **Blocked** at gate | Cancel/decline/expired proofs L-8–L-10 |
| PAID (server) | Eligible per lifecycle | Trust copy: verify before fulfill |
| REFUNDED incident | Blocked / terminal | Distinct from failed |
| Unpaid fulfillment attempt | **CRITICAL incident** `UNPAID_FULFILLMENT_ATTEMPT` | zw-doctor detects |

---

## 7. Duplicate prevention

| Vector | Control |
|--------|---------|
| Duplicate webhook | `StripeWebhookEvent` PK; P2002 ignore; L-4/L-5 proof |
| Duplicate fulfillment | Gate + attempt counters; incident `DUPLICATE_FULFILLMENT_ATTEMPT` |
| Duplicate refund | L-13 **pending**; L-11 single execute guard |
| Duplicate checkout click | Web `busyIntent` + Flutter `_busy` |

---

## 8. Webhook idempotency

- Signature verification on ingress.  
- Event ID persistence before side effects.  
- Slim handlers fast-ack unmatched/expired where designed.  
- L-6 ordering tests; L-7 unmatched classifier tests.

---

## 9. Refund safety

- Operator `l11-refund-execute` requires exact approval phrase.  
- Post-refund verify enums only.  
- **L-13** duplicate `charge.refunded` resend: checklist only, **NOT PASS**.

---

## 10. Frontend investor-grade status

| Surface | Status |
|---------|--------|
| Web top-up | **PARTIAL** — CTA guards, trust card, staging badge |
| Web success/cancel | **GAP** — dev English pages |
| Flutter checkout | **PARTIAL** — pay guards strong |
| Locales | **PARTIAL** — fa/ar/tr scaffolds |

Plan: `FRONTEND_INVESTOR_GRADE_UPGRADE_PLAN.md` (branch `chore/composer-frontend-investor-plan` when merged).

---

## 11. CI / Super-System Guard

| Workflow | Scope |
|----------|--------|
| `ci.yml` | Unit + integration + `phase1:launch-readiness` |
| `super-system-guard.yml` | secrets:scan, zw-doctor static, unit tests |
| Post-merge | intelligence + incidents `--ci-static` green |

---

## 12. Operational blockers

1. Credential rotation **execute** — forbidden without approval.  
2. **L-13** — not executed.  
3. **L-12** — partial refund pending.  
4. Production live Stripe / scale — not certified.  
5. Frontend `/success` `/cancel` investor gap.  
6. Neon dashboard final confirmation — pending operator.

---

## 13. Exact next safe steps

1. Merge audit docs PR → `main`.  
2. Frontend Phase A (success/cancel routes) — separate PR, no DB/env.  
3. Operator completes local config → rotation **dry-run** only.  
4. L-13 only with written approval after L-11 stable on confirmed DB branch.

---

## 14. Forbidden actions (agents & automation)

- DB writes, migrations, deploy without approval  
- Vercel/Neon env change  
- Payments, refunds, webhook resend  
- `credential-rotation-execute`  
- `STAGING_OPERATOR_ROTATION_APPROVAL` in automation  
- `ZW_SELF_HEALING_APPLY=true` without approval  
- False PASS / production certification claims  

---

## 15. Approval gates

| Operation | Gate |
|-----------|------|
| L-11 refund execute | `Approved: L-11 execute full refund` |
| L-13 webhook resend | `Approved: resend duplicate charge.refunded event for L-13 proof` |
| Credential rotation execute | Exact phrase in `STAGING_OPERATOR_ROTATION_APPROVAL` |
| Self-healing money apply | Explicit env enable + operator sign-off |
| Production go-live | Not defined in repo — external release control |

---

## 16. Document map (2026-05-20 audit pack)

| Document | Purpose |
|----------|---------|
| `PROJECT_MEMORY_ZORA_WALAT_MASTER.md` | **This file** — durable memory |
| `GLOBAL_SECURITY_AUDIT_2026_03_28_TO_2026_05_20.md` | Security posture table |
| `SUPER_SYSTEM_FAILURE_DETECTION_AND_AUTO_REPAIR_REPORT.md` | Detect/repair boundaries |
| `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md` | Money path deep audit |
| `GLOBAL_ENGINEERING_HEALTH_REPORT_2026_05_20.md` | Investor health summary |
| `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md` | Deferred dangerous ops |
| `PR21_POST_MERGE_VERIFICATION.md` | Merge + CI attestation |
| `AP786_EVIDENCE_INDEX.txt` | Index |

---

*No DB/env/payment mutation in authoring this memory.*
