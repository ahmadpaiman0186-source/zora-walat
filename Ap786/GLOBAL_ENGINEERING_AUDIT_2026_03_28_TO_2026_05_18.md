# Global engineering audit — 2026-03-28 through 2026-05-18

**Role:** Principal / CTO-level production architecture review (read-only audit + documented safe hardening)  
**Repository:** zora_walat  
**Audit window:** 2026-03-28 → 2026-05-18  
**Branch at audit:** `fix/post-l40-slim-stripe-webhook-invalid-signature` @ `fab4875`  
**Sanitization:** No secrets, env values, JWTs, DATABASE_URL, API keys, PII, or full Stripe object IDs.

---

## 1. Executive verdict

**Overall: PARTIAL — staging-ready money path with strong automated guards; production scale and several live proofs remain open.**

The codebase evolved from MVP checkpoint (late March) through Phase 1 money-path hardening (April), compliance/region lockdown, observability, and a May **staging operator harness** with slim serverless entrypoints for webhooks, auth, and health. Automated tests cover duplicate webhooks, ledger idempotency, fortress concurrency, and refund **guardrails** (no refund executed in this audit).

**Not proven in this audit session:** full `npm run test:ci` on operator machine, live Stripe, live Reloadly, production deploy, L-11 refund execution, or L-6/L-7 live staging webhook fixture replay.

---

## 2. Git history summary (2026-03-28 → 2026-05-18)

| Era | Themes (representative commits) |
|-----|----------------------------------|
| **Late Mar** | Flutter/web + Vercel; OTP auth; wallet verification; “fortress” concurrency checkpoint |
| **Early Apr** | CI stabilization; pricing/checkout contracts; payments lockdown; ESM/module fixes |
| **Mid Apr** | Phase 1 state machine, webhook→queued, retry/backoff, restricted regions, Stripe-safe hardening |
| **Late Apr** | Observability, controlled live-proof **guards** (not launch), compliance closeout |
| **May (ops)** | Vercel startup/readiness, DATABASE_URL normalization, slim `/api/health`, `/ready` |
| **May (money)** | Slim Stripe webhook + checkout PAID path; staging operator harness; L3–L10 evidence; L11 refund **plan + guarded tools** (no execution in audit) |

**Evidence milestones:** Ap786 Day 1 pack (`5f92629`), L4/L5 resend record (`866a26e`), P-2 auth (`5d6fa2f`), L8–L10 safety docs (May 18).

---

## 3. Project map

### Entrypoints

| Path | Role |
|------|------|
| `server/start.js` | Local API process (`npm start`) |
| `server/bootstrap.js` | Dotenv load order; Stripe webhook secret inheritance |
| `server/src/app.js` | Express factory (`createApp`) |
| `server/src/index.js` | API runtime boot |
| `server/fulfillment-worker.mjs` | BullMQ worker (optional) |
| Vercel serverless shims | Slim paths: webhook signature gate, `/ready`, `/api/health`, auth OTP/register/login |

### Money path (server)

| Area | Primary modules |
|------|-----------------|
| Checkout | `paymentController.js`, `payment.routes.js`, `checkoutPricing*` |
| Webhook | `stripeWebhook.routes.js`, `phase1StripeCheckoutSessionCompleted.js` |
| Ledger | `ledgerService.js`, idempotency keys per checkout/event |
| Fulfillment | `fulfillmentProcessingService.js`, queue producers, mock/reloadly adapters |
| Refund mirror | `phase1StripeChargeIncidents.js`, post-payment incident enums |
| Recovery | `recoveryOrchestrator.js`, `moneyPathDriftRepair.js`, reconciliation engine |
| Operator | `server/tools/staging-auth-checkout-operator.mjs`, L11 refund guards |

### Tests (213 `*.test.js` under `server/test/`)

- **Unit:** preflight, fraud, webhook truth, chaos matrix (`l11ChaosReliabilityHarness`), operator CLI safety  
- **Integration:** `test/integrations/*` — chaos webhook HTTP, fortress concurrency, wallet idempotency, self-healing, phase1 money path (require Postgres `TEST_DATABASE_URL` in CI)

### Evidence

- `Ap786/*` — sanitized staging proofs and plans (see `AP786_EVIDENCE_INDEX.txt`)

### Frontend

- Flutter app (`lib/`), Next.js marketing (`app/` or root per layout) — API via `NEXT_PUBLIC_API_URL` / dart-define; not exhaustively re-tested in this audit.

---

## 4. Security audit (Phase 2)

| Check | Status | Evidence |
|-------|--------|----------|
| Committed live secrets | **PASS** | `npm run secrets:scan` OK; tracked env files are templates only |
| `.env` gitignore | **PASS** | Root + `server/.gitignore` |
| Stripe webhook verification | **PASS** | Invalid signature → HTTP 400 (unit + integration chaos) |
| Live vs test Stripe confusion | **PARTIAL** | `stripeEnv.js`, preflight gates; operator must not paste live keys in CI YAML |
| JWT quality / CI fallback | **PARTIAL** | CI synthetic JWT only when `CI=true`; production requires real secrets |
| Operator refund execution | **PASS (guards)** | `L11_REFUND_APPROVAL` exact phrase + tests; **NOT_TESTED** execute path |
| CORS / helmet | **PARTIAL** | `app.js` helmet + cors policy; production requires explicit origins |
| Log redaction | **PARTIAL** | Pino redact paths; audit payload stripping; bootstrap logs webhook **suffix** only |
| PII in logs | **PARTIAL** | Phase1 sanitize + fraud guard tests; checkout `console.log` hardened in this audit |

---

## 5. Reliability audit (Phase 3)

| Scenario | Status | Evidence |
|----------|--------|----------|
| Duplicate Stripe webhook | **PASS (automated)** | `stripeWebhookHttpChaos.integration.test.js`, ledger counts |
| Webhook partial failure / rollback | **PASS (automated)** | `l11LedgerWebhookRollback.integration.test.js` |
| Out-of-order / unmatched events | **PARTIAL** | Classifier + chaos tests; staging replay **PENDING** per Ap786 L6/L7 |
| Fulfillment idempotency | **PASS (automated)** | `transactionFortressConcurrency`, `phase1Resilience` |
| Queue enqueue failure → inline | **PARTIAL** | Code path in `runFulfillmentDispatchForOrder`; static contract in L11 matrix |
| Stuck PROCESSING recovery | **PARTIAL** | `processingRecovery`, orchestrator tests; not full chaos kill-worker test |
| Provider timeout/5xx (mock) | **PARTIAL** | Mock airtime + resilience integration; no live Reloadly in CI |
| Reconciliation drift repair | **PARTIAL** | `selfHealingMoneyPath.integration.test.js`, recon engine tests |
| Slim route vs full bootstrap | **PARTIAL** | Dedicated slim entry tests; risk if wrong route mounted in prod |

---

## 6. Code quality (Phase 4)

**Strengths:** Centralized env (`env.js`), explicit money-path enums, operator CLI safety (`stagingOperatorCliSafety.mjs`), frozen L11 chaos scenario matrix, extensive Ap786 evidence discipline.

**Gaps:** Some Ap786 lines say **PASS** for staging flows while L6/L7 note **staging replay PENDING** — readers must distinguish automated vs live. Investor summary must not over-claim production readiness (L11 plan-only is correctly labeled in index). Prisma major upgrade available (6→7) — **NOT_TESTED** migration impact.

---

## 7. Safe fixes applied in this audit

See `GLOBAL_ENGINEERING_REPAIR_LOG_2026_05_18.md` — checkout session logging uses **suffix-only** Stripe session id in stdout and pino info (no full `cs_` id in logs).

---

## 8. What was not done

- No refund executed; `L11_REFUND_APPROVAL` not set  
- No live Stripe charges  
- No production/staging deploy  
- No `.env` / credential file edits  
- No destructive DB operations  
- No git history rewrite  

---

## 9. Rollback

Audit doc-only changes: revert Ap786 commits. Code hardening: revert `paymentController.js` logging commit. No schema changes in this audit.
