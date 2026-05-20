# Zora-Walat Super-System Global Engineering Audit

**Window:** 2026-03-28 → 2026-05-19  
**Branch at audit:** `fix/post-l40-slim-stripe-webhook-invalid-signature` @ `0f2c4e0`  
**Auditor role:** Principal engineer / CTO architecture / payment-safety / SRE / observability / abuse-prevention (read-only)  
**Sanitization:** No secrets, env values, DATABASE_URL, JWTs, API keys, PII, full Stripe IDs, or raw webhook payloads.

---

## 1. Executive verdict

**Overall classification: PARTIAL — staging money-path program is strong and evidence-backed; global production super-system is not yet closed.**

Zora-Walat evolved from a late-March MVP checkpoint into a **Phase 1 money-path fortress** with slim serverless entrypoints, operator harness tooling, Ap786 evidence discipline, and **verified staging proofs** for checkout → webhook → fulfillment, duplicate webhook resend, negative payment paths (decline, cancel, expire), and **single full refund** with post-refund incident mirror (L-11 PASS).

**What is honestly proven**

- Staging hosted Checkout happy path (test mode) with terminal fulfillment and duplicate-safe readouts.
- L-4/L-5 webhook resend does not double-fulfill.
- L-6/L-7 ordering and unmatched-event safety (**automated**; live staging fixture replay still optional).
- L-8/L-9/L-10 negative paths (decline, abandon, expired) per Ap786.
- L-11 full refund once, incident **REFUNDED**, fulfillment count **1**, no second refund.
- Frontend investor-grade copy and payment CTA guards (commits `ec4cc69`, `0f2c4e0`).
- Secrets scan clean on tracked sources; paid-before-fulfillment gate in code + tests.

**What is not proven or not built**

- **Production** live Stripe, live Reloadly, scale, DR, compliance sign-off.
- L-12 partial refund, L-13 double-refund resend (**PENDING** execution).
- Unified **Super-System Control Plane** (detect → classify → propose repair → approve → evidence) — **partial primitives only**, not a single productized CLI.
- Full `npm run test:ci` green on this audit machine (**NOT re-run** this session).
- Auto-repair money moves without human approval (**blocked by design**; `ZW_SELF_HEALING_APPLY` defaults off).

**Program verdict:** **PASS (staging money-path evidence L-1…L-11)** · **PARTIAL (global production readiness)** · **BLOCKED (unattended auto-repair / live launch)**

---

## 2. Readiness score (honest)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Staging money-path safety (L-1…L-11 evidence) | **82%** | Strong proofs; L-6/L-7 live replay optional gap |
| Automated test / CI confidence | **65%** | Large unit + integration corpus; full CI not re-run here |
| Production deploy / live money | **35%** | Staging-first; live keys and provider E2E not claimed |
| Observability & operator tooling | **70%** | `/health`, `/ready`, operator harness, phase1-truth, L11 diagnose modes |
| Self-diagnostic & auto-repair | **45%** | Drift scan + orchestrator exist; apply repairs gated; no unified control plane |
| Abuse / fraud resistance (code) | **68%** | Gates + tests; some vectors UNPROVEN at live scale |
| Frontend trust & payment UX | **75%** | Recent production copy + CTA safety; Flutter partial |
| Evidence hygiene (Ap786) | **88%** | Sanitized, suffix-only discipline; index maintained |
| **Weighted global super-system readiness** | **68%** | Investor-safe headline: *staging-ready money path; production super-system incomplete* |

---

## 3. Phase A — Repo and timeline inventory

### 3.1 Baseline (2026-05-19)

| Item | Value |
|------|-------|
| Branch | `fix/post-l40-slim-stripe-webhook-invalid-signature` |
| HEAD | `0f2c4e0` (synced with `origin/…` at audit time) |
| Working tree | Clean except `tsconfig.tsbuildinfo` (build artifact, not committed) |
| Secrets scan | **OK** (`npm run secrets:scan`) |

### 3.2 Major engineering phases (Mar 28 → May 19)

| Phase | Dates (approx) | Focus |
|-------|----------------|-------|
| MVP checkpoint | Late Mar 2026 | Flutter/web, OTP, wallet, fortress concurrency anchor |
| CI & contracts | Early Apr | Checkout/pricing contracts, payments lockdown, ESM fixes |
| Phase 1 money path | Mid–late Apr | Webhook→queue, state machine, restricted regions, Stripe hardening |
| Ops & Vercel reliability | Early May | DATABASE_URL normalization, slim `/api/health` & `/ready` |
| Staging operator harness | May 16–18 | Slim auth, checkout, status-check, Ap786 Day 1–2 |
| Refund safety (L-11) | May 18–19 | Mapping, key diagnose, `charge.refunded` slim mirror, PASS proof |
| Frontend UX | May 19 | Production copy, CTA safety, investor-safe errors |

### 3.3 Sanitized timeline table (representative)

| Date | Commit | Area | What changed | Risk reduced | Remaining gap |
|------|--------|------|--------------|--------------|---------------|
| 2026-03-28+ | `7078e7f` | Data layer | Prisma / canonical checkpoint | Schema stability | Production migration at scale unproven |
| 2026-04-xx | `125f308` | Webhook | Stripe event handling harden | Signature / routing | Serverless cold path still evolving |
| 2026-05-15 | `9884be9` | Ops | Slim `/api/health`, `/ready` | False “up” on Vercel | DB auth failures need operator runbook |
| 2026-05-16 | `5798376` | Webhook + UX | Slim `checkout.session.completed` PAID path; slim `/success` | 504 on return; unpaid after pay | Other event types need slim parity |
| 2026-05-16 | `014f666` | Operator | Fast status-check read path | Slow operator truth | Not a substitute for metrics |
| 2026-05-18 | `fcf928f` | Tests | L-6/L-7 ordering + unmatched | Wrong-order / orphan events | Live staging replay optional |
| 2026-05-18 | `866a26e` | Evidence | L-4/L-5 resend proof | Duplicate fulfillment on resend | Production webhook endpoint not claimed |
| 2026-05-18 | L-8…L-10 docs | Negative paths | Decline, cancel, expire proofs | Pay-without-fulfill on abandon | L-10 staging expire optional |
| 2026-05-19 | `f728047` | Refund mirror | Slim `charge.refunded` + post-refund verify | Incident stuck after refund | L-12/L-13 not run |
| 2026-05-19 | `9d95a63` | Evidence | L-11 PASS recorded | Refund safety narrative | Partial refund policy unproven |
| 2026-05-19 | `ec4cc69` / `0f2c4e0` | Frontend | CTA guards, trust copy, safe errors | Misleading security claims | Full Flutter l10n regen optional |

---

## 4. Money-path architecture map

### Step 1 — User selects operator / package / amount

| Attribute | Detail |
|-----------|--------|
| **Sources** | `components/topup/ZoraWalatTopUp.tsx`, `topup/catalog/*`, Flutter `checkout_screen.dart`, `recharge_screen.dart` |
| **DB fields** | Pre-checkout: client payload → `PaymentCheckout` draft fields (product, operator, amount cents, phone) |
| **External** | Catalog static + API quote (`checkout-pricing-quote`) |
| **Failure modes** | Invalid phone, missing operator, stale catalog, API base missing |
| **Tests** | `topupOrderPayload.test.js`, widget tests (Flutter) |
| **Missing tests** | E2E browser matrix all locales |
| **Observability** | Client errors; limited server-side selection audit |
| **Rollback risk** | Low (UI-only) |

### Step 2 — Checkout session creation

| Attribute | Detail |
|-----------|--------|
| **Sources** | `paymentController.js`, `server/api/slimCreateCheckoutHandler.mjs`, pricing validators |
| **DB fields** | `PaymentCheckout` idempotency key, `stripeCheckoutSessionId` suffix, `orderStatus` PENDING |
| **External** | Stripe Checkout Session API |
| **Failure modes** | Cold start timeout (mitigated by slim handler), invalid amount, auth required |
| **Tests** | `l11CheckoutSessionCreateOrchestrator.test.js`, integration payment loop |
| **Missing tests** | Load test on create-checkout at scale |
| **Observability** | Pino logs (suffix-only session ids in hardened paths) |
| **Rollback risk** | Medium (money surface) |

### Step 3 — Stripe payment confirmation

| Attribute | Detail |
|-----------|--------|
| **Sources** | Stripe Hosted Checkout (external) |
| **DB fields** | Unchanged until webhook |
| **Failure modes** | Decline, abandon, expire (L-8–L-10) |
| **Tests** | L-8 staging + automated decline fixtures |
| **Observability** | Stripe Dashboard (operator); not in app logs |
| **Rollback risk** | N/A (external) |

### Step 4 — Webhook handling

| Attribute | Detail |
|-----------|--------|
| **Sources** | `server/api/slimStripeWebhookHandler.mjs`, `slimStripeWebhookCheckoutCompleted.mjs`, `slimStripeWebhookChargeRefunded.mjs`, `phase1StripeCheckoutSessionCompleted.js` |
| **DB fields** | `StripeWebhookEvent`, ledger entries, `PaymentCheckout.status`, `orderStatus` |
| **External** | Stripe signed webhooks |
| **Failure modes** | Invalid signature, timeout, cold bootstrap, unmatched metadata |
| **Tests** | `slimStripeWebhook*.test.js`, `stripeWebhookHttpChaos.integration.test.js`, `l11LedgerWebhookRollback.integration.test.js` |
| **Missing tests** | All event types on slim path in production config |
| **Observability** | Webhook event type metrics; suffix logging |
| **Rollback risk** | **High** |

### Step 5 — Order status mutation

| Attribute | Detail |
|-----------|--------|
| **Sources** | `paymentStateMachine.js` (**PAID webhook-only**), `canonicalPhase1OrderService.js` |
| **DB fields** | `orderStatus`, `paymentStatus`, `paidAt`, `stripePaymentIntentId` |
| **Failure modes** | Illegal transition, metadata mismatch, race with client return |
| **Tests** | `moneyPathLockdown.test.js`, `paymentCompletionLinkage.test.js` |
| **Observability** | `orderTransitionLog`, phase1-truth DTO |
| **Rollback risk** | High |

### Step 6 — Fulfillment attempt

| Attribute | Detail |
|-----------|--------|
| **Sources** | `fulfillmentProcessingService.js`, `phase1FulfillmentPaymentGate.js`, queue worker |
| **DB fields** | `FulfillmentAttempt`, `orderStatus` PROCESSING→FULFILLED |
| **External** | Reloadly / mock airtime (env-gated) |
| **Failure modes** | Provider timeout, NOT_PAID gate, incident blocks |
| **Tests** | `transactionFortressConcurrency.integration.test.js`, `fulfillmentFailureSafetyAudit.test.js` |
| **Missing tests** | Live Reloadly chaos in CI |
| **Observability** | `/ready` queue depth, fulfillment metrics |
| **Rollback risk** | **High** (duplicate send) |

### Step 7 — Duplicate webhook handling

| Attribute | Detail |
|-----------|--------|
| **Sources** | Durable `StripeWebhookEvent` + ledger idempotency |
| **Tests** | L-4/L-5 evidence, chaos integration |
| **Gap** | PI vs session ordering under exotic Dashboard replays (L-6 automated PASS) |

### Step 8 — Cancel / decline / expired checkout

| Attribute | Detail |
|-----------|--------|
| **Sources** | Slim fast-ack paths, `webhookTruthContract.js` |
| **Tests** | L-8, L-9, L-10 Ap786 + `stripeWebhookHttpChaos` |
| **Gap** | L-10 live Dashboard expire optional |

### Step 9 — Refund lifecycle

| Attribute | Detail |
|-----------|--------|
| **Sources** | `phase1StripeChargeIncidents.js`, operator `l11-refund-*` tools (**guarded**), slim `charge.refunded` |
| **Policy** | Phase 1: **no app-initiated refund**; webhook mirror only |
| **Tests** | `paymentReconciliationRefundSafety.test.js`, `slimStripeWebhookChargeRefunded.test.js` |
| **Gap** | L-12 partial, L-13 duplicate refund event |

### Step 10 — Post-payment incident lifecycle

| Attribute | Detail |
|-----------|--------|
| **Sources** | `postPaymentIncidentStatus.js`, `canonicalPhase1OrderService.js`, phase1-truth |
| **L-11** | **VERIFIED** REFUNDED after full refund, fulfillment count 1 |

### Step 11 — Operator status / truth endpoints

| Attribute | Detail |
|-----------|--------|
| **Sources** | `staging-auth-checkout-operator.mjs`, `slimStagingOperatorPhase1TruthHandler.mjs`, `GET …/phase1-truth` |
| **Gap** | Production operator RBAC not same as staging harness |

### Step 12 — Evidence capture

| Attribute | Detail |
|-----------|--------|
| **Sources** | `Ap786/*`, `AP786_EVIDENCE_INDEX.txt`, operator modes (`status-check`, `l11-post-refund-verify`) |

---

## 5. Invariant verification matrix

| Invariant | Status | Evidence | Commit / gap | Recommended repair |
|-----------|--------|----------|--------------|-------------------|
| Paid before fulfillment | **VERIFIED** | `phase1FulfillmentPaymentGate.js`, `financialSafetyGate`, integration fortress | `5798376` area | Keep gate as single choke point; add alert on denial spikes |
| Fulfillment idempotency | **VERIFIED** | `transactionFortressConcurrency.integration.test.js`, L-5 resend proof | `866a26e` | Worker kill chaos test |
| Webhook idempotency | **VERIFIED** | `StripeWebhookEvent`, ledger tests, L-4/L-5 | Day 1 pack | Monitor duplicate evt rate in staging |
| Checkout session mapping safety | **VERIFIED** | L-11 mapping diagnose, hosted metadata path | `46d77ea`, `fab4875` | Document metadata contract for all clients |
| PaymentIntent mapping safety | **VERIFIED** | Suffix normalization, L11 mapping tests | `46d77ea` | — |
| Unmatched event safety | **PARTIAL** | `slimStripeWebhookUnmatchedFastAck.test.js`, L-7 automated PASS | `fcf928f` | Optional live staging fixtures |
| Event ordering safety | **PARTIAL** | L-6 automated PASS; staging replay PENDING | `fcf928f` | Run approved staging replay once |
| Refund single-execution safety | **VERIFIED** | L-11 PASS, operator guards, no second refund | `f728047`, `9d95a63` | Execute L-13 duplicate refund resend |
| Post-refund incident update | **VERIFIED** | `l11-post-refund-verify`, slim `charge.refunded` | `f728047` | — |
| No customer debug/test copy | **VERIFIED** | `FRONTEND_PRODUCTION_UX_AUDIT_2026_05_19.md`, `messages/en.ts` | `ec4cc69`, `0f2c4e0` | `flutter gen-l10n` for all arb locales |
| Frontend CTA invalid checkout | **VERIFIED** | `ZoraWalatTopUp.tsx` disabled reasons; Flutter `_canPay` | `ec4cc69` | E2E test for double-click |
| No secret leakage | **VERIFIED** | `secrets:scan`, gitignore, Ap786 rules | ongoing | Pre-commit hook optional |

---

## 6. Self-diagnostic readiness

| Capability | Present? | Location / notes |
|------------|----------|------------------|
| Health `/api/health` | Yes | Slim liveness `9884be9` |
| Readiness `/ready` | Yes | DB probe, queue metrics, bounded checks |
| Operator `status-check` | Yes | `staging-auth-checkout-operator.mjs` |
| Phase1 truth endpoints | Yes | Slim + full `phase1-truth` |
| Stripe diagnose (L11) | Yes | `l11-stripe-diagnose`, `l11-key-diagnose`, mapping |
| Refund diagnose | Yes | `l11-refund-target`, `l11-post-refund-verify` |
| Webhook resend docs | Yes | `L4_STRIPE_WEBHOOK_RESEND_PLAN.md` |
| Secrets scan | Yes | `npm run secrets:scan` |
| DB probe | Yes | `db:health`, integration preflight |
| Deploy guard | Yes | `productionDeploymentPreflight.js`, `PRELAUNCH_LOCKDOWN` |
| Vercel route diagnostics | Yes | `stagingOperatorRouteDiagnostics.mjs` |
| Integration DB setup | Yes | `533e0cf`, `test:integration:preflight` |
| Error classification codes | Yes | Webhook truth, fulfillment gate denials, recon codes |
| Incident state machine | Yes | `POST_PAYMENT_INCIDENT_STATUS` |
| Audit / evidence generation | Yes | Ap786 + operator enums |
| Recovery runbooks | Partial | `server/docs/runbooks/*`, ops reports |
| Money-path drift scan | Yes | `moneyPathDriftScan.js` |
| Self-healing apply | **Gated off** | `ZW_SELF_HEALING_APPLY` default false |

**Honest assessment:** The project can **detect** many failures and **classify** them; it cannot safely **auto-repair** money state without operator approval. Evidence generation is mature for staging; CI proof bundling is fragmented across many npm scripts.

---

## 7. Target: Zora-Walat Super-System Control Plane (proposed)

**Status today:** primitives exist; **unified control plane does not**.

| Component | Proposed command / gate | Approval |
|-----------|---------------------------|----------|
| `zw doctor` | Runs secrets scan, db:health, route diagnostics, Stripe key mode check | None |
| `zw invariants` | Wraps focused test subsets (webhook chaos, fortress, L11 unit) | None |
| `zw incident classify` | Maps phase1-truth + recon codes → playbook id | None |
| `zw repair propose` | Outputs drift scan + recon repair **plan JSON** (no apply) | None |
| `zw repair apply` | Applies only allowlisted non-money repairs | Ops token |
| `zw money` | Subcommands mirror operator harness (status-check, diagnose) | Staging JWT |
| `zw refund` | **Blocked** unless `L11_REFUND_APPROVAL` exact phrase | Human |
| `zw evidence` | Writes sanitized Ap786 snippet from last run | None |
| CI gate | `test:ci` + secrets:scan on PR | Automated |
| Staging smoke | Scripted checkout-open + status-check (test mode) | Scheduled |

**Rollback gates:** no auto-apply on production; dual-control for `ZW_SELF_HEALING_APPLY`; money mutations always require explicit approval string.

---

## 8. Error and server failure detection matrix

| Failure | Detection today | Missing detection | Recovery today | Missing recovery | Safe automation candidate |
|---------|-----------------|-------------------|----------------|----------------|---------------------------|
| API route 404 / wrong deploy root | Manual curl, route diagnostics script | Continuous synthetic probe | Redeploy correct root | Automated rollback | **Staging synthetic GET** |
| Webhook timeout | Stripe Dashboard retries; order stays unpaid | Alert on PAID lag | Resend event (L-4 runbook) | Auto-resend | **Propose** resend checklist only |
| DB auth failure | `/ready` db_error, fatal startup gate | Pager on ready fail | Fix DATABASE_URL | — | **Detect only** |
| Redis / queue failure | `/ready` queue observation | Alert when enqueue fails | Inline fulfillment fallback | Worker scale-out | **Detect + propose** |
| Prisma migration mismatch | Deploy fail, `db:validate` | CI migrate check on deploy | Run migrate | — | **CI gate** |
| Stripe key malformed / live mismatch | `stripeEnv.js`, L11 key diagnose | Frontend publishable check in CI | Fix env | — | **doctor** command |
| Operator token expired | Harness TOKEN_EXPIRED | — | Re-login | — | — |
| Frontend API base missing | UI error copy | Build-time assert in CI | Set `NEXT_PUBLIC_API_URL` | — | **CI build check** |
| Stale checkout / order ref | L11 refresh-order-ref, mapping diagnose | Client TTL warning | Operator refresh | — | **Detect** |
| Duplicate webhook resend | Idempotent ledger | Metric | 200 ack, no op | — | **Verified** |
| Webhook ordering | L-6 tests | Live replay | Classifier | — | Optional staging replay |
| `charge.refunded` handling | Slim path + L-11 PASS | L-13 duplicate evt | Incident update | — | L-13 proof |
| Provider timeout / 5xx | Mock resilience tests | Live Reloadly SLO | Retry / recovery orchestrator | — | **Propose** retry only |
| Package not delivered | SLA guard, support DTO | Customer notification automation | Manual support | — | **No auto fulfillment** |
| Retry storm | Rate limits, backoff tests | Global alert | Throttle | — | **Detect** |
| Partial failure after payment | Recon engine, stuck PAID scans | — | `processingRecovery` | — | **Propose** enqueue only |
| Refund after fulfillment | L-11 mirror policy | L-12 partial semantics | Incident REFUNDED | — | Document policy |

---

## 9. Abuse and fraud resistance matrix

| Vector | Status | Notes |
|--------|--------|-------|
| Package without payment | **BLOCKED** | Fulfillment gate requires `PAYMENT_SUCCEEDED` + PAID lifecycle |
| Reuse stale checkout | **PARTIAL** | Server validates session/PI mapping; client refresh tools exist; E2E abuse test limited |
| Modify amount / plan client-side | **BLOCKED** | Server-side pricing quote + checkout creation validation |
| Replay webhook metadata | **BLOCKED** | Signature verification + durable event id + metadata binding tests |
| Exploit cancel / success route | **BLOCKED** | Return URLs do not grant PAID; L-9/L-10 proofs |
| Double-click checkout | **PARTIAL** | Web `busyIntent`; Flutter `_busy`; not full E2E |
| Duplicate fulfillment | **BLOCKED** | Fortress + L-5 resend proof |
| Abuse refund path | **BLOCKED** | No app refund API; operator approval phrase; L-11 single refund |
| Bypass operator selection | **PARTIAL** | UI validation; server must reject invalid operator on create |
| Manipulate frontend API base | **PARTIAL** | User can point to wrong API; mitigated by HTTPS deploy config, not crypto |
| Exposed debug routes | **PARTIAL** | `PRELAUNCH_LOCKDOWN`, dev bypass blocked in production startup |
| DEV_CHECKOUT bypass | **BLOCKED** in production | `serverLifecycle` fatal if set with NODE_ENV=production |

---

## 10. Top 20 engineering gaps

1. L-12 partial refund proof not executed  
2. L-13 duplicate `charge.refunded` delivery not executed  
3. Full `test:ci` not re-run on audit machine  
4. Live Reloadly fulfillment proof not in CI  
5. No unified Super-System Control Plane CLI  
6. Auto-repair apply disabled (correct) but no single “propose” UX  
7. L-6/L-7 live staging webhook fixture replay optional  
8. L-10 staging Dashboard expire not run (automated only)  
9. Production live Stripe keys / go-live checklist not closed  
10. Prisma 6→7 upgrade impact not tested  
11. Webhook slim path coverage for all subscribed event types not cataloged  
12. Queue worker failure / kill-worker chaos incomplete  
13. Customer-facing Flutter l10n not fully regenerated across locales  
14. Synthetic monitoring for staging API + webhook endpoint absent  
15. Chargeback / dispute matrix beyond partial chaos tests  
16. Rate-limit / retry storm alerting not wired to paging  
17. Cross-region DR and backup restore drill not automated in CI  
18. `NEXT_PUBLIC_*` misconfiguration detection not in frontend CI  
19. Partial failure after payment → stuck PROCESSING needs runbook automation  
20. Investor doc must distinguish staging PASS vs production readiness (discipline risk)

---

## 11. Top 20 repair roadmap (prioritized)

1. Execute **L-13** duplicate refund resend (approved, test mode)  
2. Execute **L-12** partial refund with desk review of incident semantics  
3. Run **`npm run test:ci`** on integration DB and archive result in Ap786  
4. Implement **`zw doctor`** wrapping secrets scan + db:health + route diagnostics  
5. Add **staging synthetic probe** (health + ready + optional status-check token)  
6. Catalog **slim webhook event coverage** vs Stripe Dashboard subscription list  
7. **Live Reloadly sandbox** proof script in scheduled staging job  
8. Worker **kill chaos** integration test (enqueue → kill → recover)  
9. Frontend CI: fail build if `NEXT_PUBLIC_API_URL` / Stripe pk missing for production profile  
10. Regenerate **Flutter l10n** after arb changes  
11. Wire **Grafana/Datadog** counters from existing metrics modules (if not already deployed)  
12. Close **go-live** checklist: live keys, `PRELAUNCH_LOCKDOWN` policy, CORS  
13. Document **metadata contract** for hosted checkout (session vs PI) for all clients  
14. Add E2E **double-submit** test for web top-up  
15. Consolidate npm **proof:** scripts under control plane  
16. Run **L-10** staging expire once for corroboration  
17. Optional **L-6/L-7** staging replay with sanitized evidence row  
18. Review **partial refund** policy in `phase1StripeChargeIncidents.js` before L-12  
19. Update **DAY2_L8_L13_EXECUTION_PLAN.md** L-11 status from PLAN_READY → PASS (doc hygiene)  
20. Production **canary** deploy with rollback runbook drill  

---

## 12. Recommended next 5 Cursor Agent prompts

1. **“Run `npm run test:ci` on integration Postgres, capture sanitized pass/fail summary into Ap786, no secrets.”**  
2. **“Design and scaffold `zw doctor` CLI (secrets scan, db health, staging route diagnostics) without money mutations.”**  
3. **“Prepare L-13 execution plan only: duplicate charge.refunded resend checklist + expected enums; do not execute refund.”**  
4. **“Add staging synthetic monitor spec (curls + expected HTTP codes) as docs + optional GitHub Action workflow.”**  
5. **“Audit slim Stripe webhook handlers vs subscribed events; output gap table in Ap786.”**

---

## 13. PASS / PARTIAL / BLOCKED summary

| Area | Verdict |
|------|---------|
| Staging payment → fulfillment happy path | **PASS** |
| L-4/L-5 duplicate webhook | **PASS** |
| L-6/L-7 ordering / unmatched (automated) | **PASS** (live replay **PARTIAL**) |
| L-8 decline | **PASS** |
| L-9 cancel | **PASS** |
| L-10 expire | **PASS** (automated); staging expire **PARTIAL** |
| L-11 full refund | **PASS** |
| L-12 partial refund | **BLOCKED** (not executed) |
| L-13 double refund event | **BLOCKED** (not executed) |
| Frontend investor UX | **PASS** |
| Global production launch | **BLOCKED** |
| Unattended auto-repair | **BLOCKED** (by design) |
| Super-System Control Plane | **PARTIAL** (proposed) |

---

## 14. No secrets / no PII confirmation

This audit was produced without executing refunds, payments, or live Stripe actions. No `.env*` files were committed. Evidence uses suffix-only identifiers and enums. `secrets:scan` passed on tracked sources at audit time.

---

## 15. Related evidence files

- `AP786_EVIDENCE_INDEX.txt`  
- `AP786_ALL_PASSES_INVESTOR_PROOF.md`  
- `GLOBAL_ENGINEERING_AUDIT_2026_03_28_TO_2026_05_18.md`  
- `FRONTEND_PRODUCTION_UX_AUDIT_2026_05_19.md`  
- `L11_REFUND_EXECUTION_AND_POST_REFUND_PROOF.md`  
- `DAY2_L8_L13_EXECUTION_PLAN.md`
