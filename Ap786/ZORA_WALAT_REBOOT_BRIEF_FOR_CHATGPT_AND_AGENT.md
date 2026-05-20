# Zora-Walat â€” Reboot brief for ChatGPT, Cursor Agent, and senior engineers

**Purpose:** Single canonical handoff after memory reset. Read this file first, then follow links.
**Coverage window:** 2026-03-28 â†’ 2026-05-20
**Last updated:** 2026-05-20
**Canonical memory:** This file + `PROJECT_MEMORY_ZORA_WALAT_MASTER.md`
**Sanitization rule:** All evidence is enum-only, boolean-only, suffix-only, count-only â€” never secrets, DATABASE_URL, tokens, JWTs, Stripe keys, password hashes, full Stripe IDs, PII, or raw webhooks.

---

## How to use this brief

1. Read Â§1â€“Â§8 for identity, repo state, architecture, money path, security, super-system, frontend, agent policy.
2. Read Â§9â€“Â§12 for blockers, next safe steps, forbidden operations, ChatGPT start prompt.
3. Use Â§13 document map for deep dives.
4. Paste Â§12 into ChatGPT after memory reset; use Â§13 template for Cursor agents.
5. Never claim PASS for production, L-13, rotation complete, or frontend investor-grade unless a linked Ap786 doc explicitly records executed proof.

---

## 1. PROJECT IDENTITY

| Field | Value |
|-------|--------|
| **Project name** | Zora-Walat (`zora_walat`) |
| **Business purpose** | International mobile top-up (airtime/data/calling) for diaspora and travelers â€” Stripe-hosted checkout, operator fulfillment |
| **Current product scope** | **Phase 1:** USD Stripe Checkout â†’ webhook-confirmed PAID â†’ fulfillment queue â†’ terminal fulfilled state. Staging proofs through **L-11**. Flutter airtime checkout + Next.js web top-up. Wallet/calling broader features partial. |
| **Critical business rule** | **No pay, no service** â€” fulfillment and provider spend only after server-confirmed payment (`PAYMENT_SUCCEEDED` / PAID). Client return URLs and UI state do not grant service. |
| **Critical engineering rule** | **Zero duplicate transaction / zero duplicate fulfillment** in verified scope â€” webhook idempotency, fulfillment gate, duplicate-safe counters; L-4/L-5 resend proof. L-13 duplicate *refund event* not yet executed. |

**Super-System target behavior:** Detect failures, classify errors, protect money path, fail closed, propose repairs, require human approval for mutations â€” never false PASS.

---

## 2. CURRENT REPO STATE

| Item | Value |
|------|--------|
| **Production line** | `main` |
| **PR #21** | **Merged** @ `2ea64a2` â€” Super-System Guard, zw-doctor, incidents, intelligence, slim paths, Ap786 evidence |
| **Post-merge evidence on main** | `ab5817d` â€” `PR21_POST_MERGE_VERIFICATION.md` |
| **Pre-merge CI fix** | `2c04d8b` â€” wire `runZwDoctorIntelligence` (fixed Guard ReferenceError) |
| **Global audit branch** | `audit/global-super-system-health-2026-05-20` @ `e8583d3` (includes this reboot brief + audit pack @ `4b32db9`) â€” **merge docs-only PR to main after green CI** |
| **Frontend plan branch (optional)** | `chore/composer-frontend-investor-plan` @ `dac5f7e` â€” `CURSOR_COMPOSER_2_5_DECISION_AND_AGENT_POLICY.md`, `FRONTEND_INVESTOR_GRADE_UPGRADE_PLAN.md` (**merge if not on main**) |
| **Current active branch (authoring)** | `audit/global-super-system-health-2026-05-20` |
| **Readiness** | **68% PARTIAL** â€” staging money-path strong; production/live/L-13/rotation/frontend not closed |
| **CI on main** | **Green** (operator attestation): CI server, CI flutter, Super-System Guard, Phase 1 money-path integrity **PASS** |
| **Working tree (audit branch)** | Clean at authoring; verify with `git status -sb` before edits |

### Key commits (chronological highlights)

| Commit | Meaning |
|--------|---------|
| `5798376` | Slim `checkout.session.completed` + `/success` |
| `5d6fa2f` | Operator auth harness hardening |
| `866a26e` / L-4/L-5 | Duplicate webhook resend proof |
| `f728047` | L-11 `charge.refunded` slim mirror |
| `079d633` / `1585d08` | zw-doctor + Super-System Guard workflow |
| `2ea64a2` | **PR #21 merge** |
| `ab5817d` | Post-merge verification doc |
| `4b32db9` | Global audit pack (audit branch) |
| `e8583d3` | Reboot brief (this file) |

---

## 3. ARCHITECTURE SNAPSHOT

### Frontend (web)

| Path | Role |
|------|------|
| `app/page.tsx` | Main top-up (`ZoraWalatTopUp`) |
| `app/success`, `app/cancel` | Stripe return routes â€” **investor gap** (hardcoded English/dev copy) |
| `app/history` | Session-scoped order history |
| `components/topup/` | Checkout UI, Stripe Elements, CTA guards |
| `messages/{en,fa,ar,tr}.ts` | i18n â€” `en` complete; others partial scaffold |

### Flutter / mobile

| Path | Role |
|------|------|
| `lib/features/telecom/presentation/checkout_screen.dart` | Pay CTA guards, Stripe redirect |
| `lib/l10n/app_*.arb` | Localizations â€” some test/dev strings remain in wallet ARB |
| `lib/services/payment_service.dart` | Checkout session, lockdown handling |

### Server / API

| Path | Role |
|------|------|
| `server/api/slim*.mjs` | Vercel serverless: auth, checkout, webhook, operator read paths |
| `server/src/` | Express domain: payments, webhooks, `phase1FulfillmentPaymentGate`, queues |
| `server/prisma/schema.prisma` | Postgres models |
| `server/tools/zw-doctor.mjs` | Super-System diagnostic CLI |
| `server/tools/staging-auth-checkout-operator.mjs` | Operator harness (gated money modes) |
| `server/tools/stagingOperatorCredentialRotation.mjs` | Rotation diagnose/plan/dry-run/execute (execute gated) |

### Stripe / payment / webhook flow (happy path)

```text
User selects plan â†’ create checkout (PENDING)
â†’ Stripe Hosted Checkout
â†’ checkout.session.completed webhook â†’ server marks PAID
â†’ canOrderProceedToFulfillment â†’ queue/worker â†’ FULFILLED
â†’ operator status-check: PAID_CONFIRMED true, fulfillment count 1
```

### Fulfillment flow

- BullMQ/Redis Phase 1 queue; idempotent producer/worker.
- Gate: `server/src/lib/phase1FulfillmentPaymentGate.js` â€” `canOrderProceedToFulfillment`.

### Refund / incident flow

- Operator `l11-refund-execute` (approval phrase) OR Stripe `charge.refunded` webhook (slim mirror).
- Post-payment incident â†’ **REFUNDED**; L-11 proof: single refund, fulfillment count still **1**.

### Operator harness

- Modes: login, checkout, status-check, phase1-truth, L-11 preflight/refund/diagnose, credential-rotation-*, etc.
- **Current login:** HTTP **401** `invalid_credentials` â€” harness blocked until rotation (execute not done).

### Infrastructure

| Layer | Detail |
|-------|--------|
| **Deploy** | Vercel; API deploy root = `server/` (`assert-vercel-api-deploy-root.mjs`) |
| **DB** | Neon Postgres; staging branch name in governance doc: `staging-stripe-test-2026-05-12` (project id in Ap786 â€” no connection strings) |
| **ORM** | Prisma |
| **CI** | `.github/workflows/ci.yml`, `super-system-guard.yml`, `nightly-fortress.yml` |

### Ap786 evidence system

- Repo-canonical sanitized proofs under `Ap786/`.
- Index: `AP786_EVIDENCE_INDEX.txt`.
- Investor summary: `AP786_ALL_PASSES_INVESTOR_PROOF.md` â€” **not** production certification.

---

## 4. MONEY-PATH SAFETY MODEL

| Control | Status |
|---------|--------|
| Webhook-only PAID authority | **PASS** (code + staging evidence) |
| Paid-before-fulfillment | **PASS** â€” `canOrderProceedToFulfillment` |
| Duplicate webhook replay | **PASS** â€” L-4/L-5; `StripeWebhookEvent` idempotency |
| Fulfillment idempotency | **PASS** (staging + tests) |
| Cancel / decline / expired (no fulfill) | **PASS** â€” L-9, L-8, L-10 |
| Refund mirror | **L-11 PASS** (single full refund, test mode) |
| **L-12** partial refund | **PENDING** â€” not implemented |
| **L-13** duplicate refund event | **NOT EXECUTED** â€” checklist only |

### Staging proof ladder (L-1â€¦L-13)

| Level | Status | Notes |
|-------|--------|-------|
| L-1â€¦L-7 | **PASS** (evidence) | Day 1 + webhook ordering/unmatched tests |
| L-8 decline | **PASS** | |
| L-9 cancel | **PASS** | |
| L-10 expired | **PASS** (automated); live expire optional |
| L-11 full refund | **PASS** | Once; suffix `â€¦04pvq0dr78` in evidence |
| L-12 partial refund | **PENDING** | |
| L-13 duplicate refund event | **NOT PASS** | Do not claim |

### Exact non-claims

- **Not** production live-money certified.
- **Not** L-13 or L-12 PASS.
- **Not** safe to run unattended refunds, webhook resends, or DB repair.
- **Not** â€œbank-gradeâ€ or â€œguaranteed instant deliveryâ€ in customer copy policy.

---

## 5. SECURITY AND ACCESS MODEL

| Topic | Status |
|-------|--------|
| **Operator auth** | **BLOCKED** â€” staging login **401**; P-2 historical PASS may be stale |
| **Credential rotation** | Plan + tooling on `main`; **dry-run BLOCKED** (missing gitignored local email); **execute NOT RUN** |
| **Secrets in git** | **PASS** â€” `npm run secrets:scan` in CI/Guard |
| **Gitignore** | `.env*`, `.staging-token.local`, operator locals under `server/.gitignore` |
| **Stripe test/live** | Classifier + zw-doctor invariant `STRIPE_LIVE_KEY_IN_TEST_CONTEXT`; operator must confirm Vercel env vs Neon branch |
| **DATABASE_URL** | Never in docs/commits; normalization in server code only |
| **Evidence rule** | Enum/boolean/suffix/count only â€” see header of every Ap786 file |

**Agents:** Never set `STAGING_OPERATOR_ROTATION_APPROVAL`; never run `credential-rotation-execute`.

---

## 6. SUPER-SYSTEM INTELLIGENCE STATUS

### zw-doctor modes (from `server/`, propose-only)

| Mode | Purpose |
|------|---------|
| `summary` | Static invariants, deploy root, stripe env |
| `money-path` | Money-path invariant report |
| `incidents` | 21-type incident classifier |
| `intelligence` | Error category synthesis (read-only) |
| `stripe-env`, `webhook`, `operator-auth`, etc. | Targeted probes |

**CI-safe flags:** `--ci-static` (no staging/operator probes), `--strict`, `--no-operator`, `--no-staging`.

### Super-System Guard (`.github/workflows/super-system-guard.yml`)

Runs on PR and push to `main`/`master`:

- `npm run secrets:scan`
- `zw-doctor summary --strict --no-operator --no-staging`
- `zw-doctor incidents --strict --ci-static`
- `zw-doctor intelligence --ci-static`
- Unit tests: zwDoctor, sanitizer, incidents, intelligence

**Does not run:** payments, refunds, webhooks, DATABASE_URL, operator login.

### Post-merge read-only signals (attested on `main`)

| Signal | Value |
|--------|--------|
| `MONEY_MUTATION_EXECUTED` | **false** |
| `SELF_HEALING_APPLY_ALLOWED` | **false** |
| `ACTIVE_INCIDENT_COUNT` | **0** |
| `ACTIVE_MONEY_INCIDENT_COUNT` | **0** |
| `FAIL_CLOSED_MONEY_PATH` | **true** |
| `incident_verdict` | **PASS** |
| `ZW_INTELLIGENCE_VERDICT` | **WARN** (static profile â€” review categories; not a money incident) |

### Detected today vs not auto-repaired

| Detected | Not auto-repaired |
|----------|-------------------|
| Missing/malformed Stripe pk, live key in test, wrong deploy root, secrets scan fail, unpaid fulfillment drift (invariants), incident taxonomy | DB writes, env changes, refunds, webhook resend, credential execute, `ZW_SELF_HEALING_APPLY` money fixes |

### Safe failover boundaries

- **No silent** DATABASE_URL or payment-provider failover.
- Stripe retries webhooks; handlers idempotent.
- UI/checkout **fail closed** when keys missing.
- Human deploy rollback on Vercel; git revert on `main`.

**KPI targets:** duplicate tx **0**, unpaid fulfillment **0**, secret leakage in git **0**, active money incidents **0** (ci-static attested).

---

## 7. FRONTEND INVESTOR-GRADE STATUS

| Verdict | **NOT PASS** (overall) |

### Strong areas

- `ZoraWalatTopUp.tsx`: disabled continue reasons, Stripe redirect copy, trust card, staging badge when `NEXT_PUBLIC_ZW_APP_ENV=staging|preview`.
- `messages/en.ts`: production-safe payment language (post 2026-05-19).
- Flutter `checkout_screen.dart`: `_canPay`, `_busy`, disabled reason strings.

### Weak areas

- `app/success/page.tsx`, `app/cancel/page.tsx`: hardcoded English, dev diagnostics (session/order ids, port hints).
- `messages/fa|ar|tr`: partial â€” many keys still English via spread.
- Flutter `walletTopUpHint` in `app_en.arb`: â€œtesting your integrationâ€ wording.
- Header nav â€œHow it worksâ€ / â€œSupportâ€: non-linked placeholders on web.

### Top remaining fixes (priority)

1. Locale-aware production-safe `/success` and `/cancel`.
2. Remove integration-test copy from Flutter wallet ARB.
3. Complete trust/error/history translations in fa/ar/tr.
4. Real support/how-it-works routes or remove placeholders.
5. Qualify â€œFast deliveryâ€ hero stat.

### Next frontend branch and scope (Phase A)

- **Branch to create:** `feat/frontend-phase-a-investor-grade` (from `main` after audit docs merge).
- **Scope only:** `app/success/page.tsx`, `app/cancel/page.tsx`, Flutter `walletTopUpHint` copy, i18n customer-safe copy.
- **No:** DB, env, payment, deploy.
- **Planning docs:** `FRONTEND_INVESTOR_GRADE_UPGRADE_PLAN.md` on `chore/composer-frontend-investor-plan`; on `main`: `FRONTEND_PRODUCTION_UX_AUDIT_2026_05_19.md`.

**Do not mark frontend investor-grade PASS until Phase A merged and reviewed.**

---

## 8. COMPOSER / AGENT OPERATING POLICY

| Rule | Value |
|------|--------|
| **Cursor plan** | **Pro+ sufficient** â€” **Ultra not needed** now |
| **Fast mode** | Not default â€” prefer accuracy on money-path tasks |
| **On-demand spend** | Keep capped |

### Agent allowed

- Audit and Ap786 evidence/docs
- Read-only diagnostics: `zw-doctor` with `--ci-static`, `secrets:scan`
- Refactors and tests (no live secrets / no DB mutation)
- **Scoped implementation** only when task explicitly limits scope (e.g. frontend Phase A files only)
- CI wiring, gitignore, sanitizer/redaction improvements

### Agent forbidden

- DB mutation, migrations
- Vercel or Neon env change, deploy
- Payments, refunds, webhook resend
- `credential-rotation-execute`
- Setting `STAGING_OPERATOR_ROTATION_APPROVAL`
- `ZW_SELF_HEALING_APPLY` money/state repair without approval
- False PASS claims (production-ready, L-13, rotation complete, frontend investor PASS)
- Printing or storing secrets, DATABASE_URL, tokens, JWTs, Stripe keys, PII

### Approval gates (human only â€” agents propose, never execute)

| Operation | Gate |
|-----------|------|
| L-11 refund execute | `Approved: L-11 execute full refund` |
| L-13 webhook resend | `Approved: resend duplicate charge.refunded event for L-13 proof` |
| Credential rotation execute | Exact phrase in `STAGING_OPERATOR_ROTATION_APPROVAL` (operator local only) |
| Self-healing money apply | `ZW_SELF_HEALING_APPLY` + incident commander sign-off |
| Production go-live | External release control |

Runbooks: `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md`. Extended policy: `CURSOR_COMPOSER_2_5_DECISION_AND_AGENT_POLICY.md` (on `chore/composer-frontend-investor-plan` if not merged).

---

## 9. REMAINING BLOCKERS

Exactly as of 2026-05-20 â€” do not mark complete without new Ap786 proof:

1. **Credential rotation execute** â€” pending; forbidden without separate approval.
2. **L-13 duplicate refund proof** â€” pending; checklist only; **NOT PASS**.
3. **L-12 partial refund** â€” pending; not implemented.
4. **Production live-money certification** â€” not claimed.
5. **Frontend investor-grade** â€” **NOT PASS** (`/success`, `/cancel`, wallet copy, i18n gaps).
6. **Neon/Vercel final operator confirmation** â€” pending dashboard alignment with staging branch governance.
7. **Intelligence WARN review** â€” pending: `zw-doctor intelligence --ci-static` may report `ZW_INTELLIGENCE_VERDICT WARN` on static profile; review categories â€” **not** a money incident (`ACTIVE_MONEY_INCIDENT_COUNT 0`).

---

## 10. NEXT SAFE 3 STEPS

Execute in this order:

**A. Merge audit docs into `main`**

- Branch: `audit/global-super-system-health-2026-05-20`
- PR: **docs-only** (audit pack + this reboot brief)
- Wait for **green CI** and **Super-System Guard** on the PR
- Then merge to `main`

**B. Merge composer frontend plan docs (if not already on `main`)**

- Branch: `chore/composer-frontend-investor-plan`
- PR: **docs-only** â€” `CURSOR_COMPOSER_2_5_DECISION_AND_AGENT_POLICY.md`, `FRONTEND_INVESTOR_GRADE_UPGRADE_PLAN.md`
- Skip if already merged

**C. Start frontend Phase A implementation**

- Create branch: `feat/frontend-phase-a-investor-grade` from updated `main`
- Scope **only:**
  - `app/success/page.tsx`
  - `app/cancel/page.tsx`
  - Flutter `walletTopUpHint` copy (`lib/l10n/app_en.arb` + synced locales)
  - i18n customer-safe copy (`messages/*`, related ARB)
- **No** DB, env, payment, deploy

**Safe validation (from `server/`):**

```bash
npm run secrets:scan
npm run zw:doctor -- incidents --ci-static
npm run zw:doctor -- intelligence --ci-static
```

---

## 11. FORBIDDEN UNTIL EXPLICIT APPROVAL

Do not run or automate these without documented human approval:

- `credential-rotation-execute`
- `STAGING_OPERATOR_ROTATION_APPROVAL` (agents must never set)
- refund (including `l11-refund-execute`)
- payment / live Stripe charges
- webhook resend (Stripe Dashboard or API)
- migration / Prisma migrate deploy to shared DB
- Vercel env change
- Neon change (branch delete, expire, connection target change)
- deploy (staging or production)
- self-healing apply that mutates infra or money state (`ZW_SELF_HEALING_APPLY`)

---

## 12. COPY-PASTE START PROMPT FOR FUTURE CHATGPT SESSION

Paste this after memory reset:

```text
Read this Zora-Walat reboot brief. Continue from the current state. Do not assume production-ready. Follow Super-System standard. First ask me which track to continue: frontend Phase A, credential rotation approval, L-13 proof, or readiness review.
```

**File to attach or paste path:** `Ap786/ZORA_WALAT_REBOOT_BRIEF_FOR_CHATGPT_AND_AGENT.md`

---

## 13. CANONICAL DOCUMENT MAP

| Read first | File |
|------------|------|
| **This handoff** | `ZORA_WALAT_REBOOT_BRIEF_FOR_CHATGPT_AND_AGENT.md` |
| Durable memory | `PROJECT_MEMORY_ZORA_WALAT_MASTER.md` |
| Health / 68% | `GLOBAL_ENGINEERING_HEALTH_REPORT_2026_05_20.md` |
| Security table | `GLOBAL_SECURITY_AUDIT_2026_03_28_TO_2026_05_20.md` |
| Money path | `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md` |
| Detect/repair | `SUPER_SYSTEM_FAILURE_DETECTION_AND_AUTO_REPAIR_REPORT.md` |
| Gated ops | `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md` |
| PR #21 merge | `PR21_POST_MERGE_VERIFICATION.md` |
| Investor summary | `AP786_ALL_PASSES_INVESTOR_PROOF.md` |
| Index | `AP786_EVIDENCE_INDEX.txt` |
| Incidents | `SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md` |
| Control plane | `SUPER_SYSTEM_CONTROL_PLANE_ARCHITECTURE.md` |
| L-13 checklist | `L13_DUPLICATE_REFUND_EVENT_SAFETY_CHECKLIST.md` |
| Neon governance | `P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md` |
| Operator rotation | `P0_OPERATOR_AUTH_CREDENTIAL_ROTATION_PLAN.md` |
| Frontend UX (prior) | `FRONTEND_PRODUCTION_UX_AUDIT_2026_05_19.md` |
| Frontend plan (branch) | `FRONTEND_INVESTOR_GRADE_UPGRADE_PLAN.md` on `chore/composer-frontend-investor-plan` |

---

## 14. CURSOR AGENT PROMPT TEMPLATE (copy-paste)

```text
You are working on Zora-Walat. Read Ap786/ZORA_WALAT_REBOOT_BRIEF_FOR_CHATGPT_AND_AGENT.md first.

Super-System rules:
- Protect money path; fail closed; no false PASS claims.
- Forbidden: DB mutation, migrations, Vercel/Neon env change, deploy, payments, refunds, webhook resend, credential-rotation-execute, STAGING_OPERATOR_ROTATION_APPROVAL, secrets in output.
- Allowed: docs, audit, read-only zw-doctor (--ci-static), secrets:scan, safe tests, non-money code per task scope.

Current truth (2026-05-20):
- main: PR #21 merged (2ea64a2); Guard green; 68% PARTIAL readiness.
- Staging L-1..L-11 PASS (test mode); L-12/L-13 NOT PASS; production NOT certified.
- Frontend investor-grade NOT PASS; operator auth 401; rotation execute NOT RUN.
- SELF_HEALING_APPLY_ALLOWED false; MONEY_MUTATION_EXECUTED false.

Task: [describe scoped task]
Branch: [name]
Do not execute gated operations in GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md.
```

---

## 15. TIMELINE SUMMARY (2026-03-28 â†’ 2026-05-20)

| Period | Engineering focus |
|--------|-------------------|
| Late Mar 2026 | MVP baseline, Prisma, auth/OTP |
| Apr 2026 | CI, payment contracts, Phase 1 webhookâ†’queue, state machine |
| Early May 2026 | Vercel slim health/ready, operator harness, Ap786 Day 1 |
| Mid May 2026 | L-4â€“L-11 proofs, refund mirror, negative paths |
| 2026-05-19 | Frontend production copy + CTA safety |
| 2026-05-19â€“20 | zw-doctor, Super-System Guard, PR #21 merge, global audit pack |

---

## 16. REPO LAYOUT (quick)

```text
zora_walat/
â”œâ”€â”€ app/                 # Next.js pages
â”œâ”€â”€ components/topup/    # Web checkout UI
â”œâ”€â”€ messages/            # Web i18n
â”œâ”€â”€ lib/                 # Flutter app + shared
â”œâ”€â”€ server/              # API (Vercel root), prisma, tools, tests
â”œâ”€â”€ Ap786/               # Sanitized evidence (THIS FOLDER)
â””â”€â”€ .github/workflows/   # ci.yml, super-system-guard.yml
```

---

*Authored as docs-only handoff. No DB/env/payment/refund/webhook/credential action.*
