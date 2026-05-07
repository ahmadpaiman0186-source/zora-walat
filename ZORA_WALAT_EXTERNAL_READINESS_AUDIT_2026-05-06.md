# Zora-Walat — External verification readiness audit

**Document date:** 2026-05-06  
**Audience:** Operators, production reviewers, investors, future agents.  
**Scope:** Items that **cannot** be fully proven from the repository alone (dashboards, accounts, cloud, TLS, live-path behavior).  
**Rules:** No secrets, no API keys, no webhook secrets, no DB URLs, no live Stripe charges, no live Reloadly calls in this document. Status values below reflect **this audit session only**: without operator-supplied redacted evidence, items are **NOT VERIFIED**.

**Companion documents:**  
- [`ZORA_WALAT_MASTER_HANDOFF_2026-05-06.md`](./ZORA_WALAT_MASTER_HANDOFF_2026-05-06.md) — code, architecture, internal L1–L24 thematic table.  
- [`ZORA_WALAT_L_ROADMAP_CHECKPOINT.md`](./ZORA_WALAT_L_ROADMAP_CHECKPOINT.md) — durable L1–L24 **checkpoint** lines (different numbering/titles than the handoff thematic table; both describe closed internal gates).

---

## 1. Executive summary

| Statement | Status |
|-----------|--------|
| **Internal engineering / repo gates** | Per **`ZORA_WALAT_L_ROADMAP_CHECKPOINT.md`**, **L1–L24 are documented as CLOSED** with cited proofs (CI, tests, docs). The **master handoff** §13 uses a **thematic** L1–L24 table aligned to architecture topics; both are **internal** artifacts. |
| **External readiness** | **Separate** from code completeness. Stripe Dashboard, Reloadly account, deployed cloud, managed data stores, TLS, webhook delivery in a real URL, alert routing, and staged E2E under production-like secrets are **NOT VERIFIED** in this file without operator evidence. |
| **Broad public launch** | **Not approved** until external checks in §§3–8 pass and blockers in §9 are closed with proof. |
| **Controlled staging / soft launch** | May proceed **only after** required external checks pass (§10 **GO** criteria), owner/invite controls on, and rollback understood. |

---

## 2. Scope of this audit

| Area | What must be verified externally |
|------|----------------------------------|
| **Stripe Dashboard** | Account health, keys in vault, webhook endpoint, events, test delivery. |
| **Reloadly account** | Sandbox/live account state, operators, quotas, compliance corridor. |
| **Cloud deployment** | API + worker processes, env injection, logs, rollback. |
| **Managed PostgreSQL** | Connectivity, backups, migration state vs schema. |
| **Managed Redis** | Connectivity, HA choice, queue behavior. |
| **Domain / HTTPS** | Certificates, DNS, public webhook reachability. |
| **Stripe webhook endpoint** | HTTPS, signing secret, raw body (code mounts webhook before `express.json` — behavior must still be verified on deployed URL). |
| **Staging environment** | Isolated DB/Redis, test-mode Stripe, sandbox/mock provider, flags. |
| **Soft-launch gates** | `soft-launch:gate`, allowlists, safety flags per `server/docs/DEPLOYMENT_READINESS.md`. |
| **Monitoring / alert routing** | Metrics scrape, log drains, on-call routing (not fully provable from repo). |
| **Support / admin operations** | Bull Board protection, admin auth, runbooks. |
| **Compliance / restricted-region** | Product copy, geo blocks, Stripe/Reloadly policy alignment — legal/compliance review outside repo. |
| **Final go/no-go** | §10 checklist. |

---

## 3. Stripe Dashboard verification

| Item | Required evidence | Status | Notes |
|------|-------------------|--------|-------|
| Stripe account active / not restricted | Dashboard account status (redacted screenshot name) | **NOT VERIFIED** | Operator to supply. |
| Test mode keys configured for staging | Redacted “API keys present” view or env-var *names-only* list in host UI | **NOT VERIFIED** | Never record key values. |
| Live mode keys only in host/vault (never in git) | `git` history clean + vault/host screenshot (redacted) | **NOT VERIFIED** | Repo claims `.env.production` not committed filled; verify in org. |
| Webhook endpoint exists: `POST /webhooks/stripe` | Dashboard endpoint URL matching deployed API | **NOT VERIFIED** | Path matches `server/src/app.js` mount. |
| Webhook signing secret in deployment env | Host env *names* screenshot; value never logged | **NOT VERIFIED** | `STRIPE_WEBHOOK_SECRET` pattern referenced in code/docs. |
| `checkout.session.completed` enabled (and any other required events) | Dashboard webhook event list | **NOT VERIFIED** | Confirm against `stripeWebhook.routes.js` handlers. |
| `payment_intent.succeeded` (if used) documented | Event list + code cross-check | **NOT VERIFIED** | Document actual subscribed events when verified. |
| Restricted countries/products align with Stripe policy | Compliance memo + Dashboard | **NOT VERIFIED** | Legal/compliance. |
| No Iran/restricted-region services on live site/app | Live UX + policy review | **NOT VERIFIED** | Code has restricted-region middleware; production config must match. |
| Payout / capabilities status | Dashboard (redacted) | **NOT VERIFIED** | |
| Disputes/refunds plan | Written runbook | **NOT VERIFIED** | |
| Test transaction in Stripe **test** mode | Payment success + PaymentIntent/Session IDs (non-secret) | **NOT VERIFIED** | No live charges without approval. |
| Webhook event delivery success visible | Dashboard delivery log for test event | **NOT VERIFIED** | |
| No raw key values in audit artifacts | Review | **PASS** (process) | This document records no secrets. |

**Evidence format:** Redacted screenshot filenames only; event IDs may be recorded if non-sensitive; never full secrets.

---

## 4. Reloadly account verification

| Item | Required evidence | Status | Notes |
|------|-------------------|--------|-------|
| Reloadly account active | Dashboard (redacted) | **NOT VERIFIED** | |
| Sandbox credentials exist | Presence in vault; never values here | **NOT VERIFIED** | |
| Live credentials exist but not exposed | Vault policy | **NOT VERIFIED** | |
| OAuth token request works in **sandbox** | Script log excerpt without secrets (`npm run reloadly:sandbox-readiness` or org process) | **NOT VERIFIED** | Run only in approved env. |
| Afghanistan operators available | Operator catalog screenshot or API response (redacted) | **NOT VERIFIED** | |
| Roshan / AWCC / Etisalat / MTN mapping verified (if used) | Mapping table + provider proof | **NOT VERIFIED** | |
| Sandbox top-up or mock-equivalent proof | Transaction ID / correlation (non-secret) | **NOT VERIFIED** | |
| **Live** top-up | N/A unless explicitly approved | **NOT EXECUTED** | Audit does not run live provider posts. |
| Provider transaction lookup/report endpoint | API doc + sample (redacted) | **NOT VERIFIED** | |
| Rate limits / quota | Reloadly plan + dashboard | **NOT VERIFIED** | |
| Refund/reversal policy | Provider terms + internal policy | **NOT VERIFIED** | |
| Reloadly compliance / allowed corridors | Provider + legal sign-off | **NOT VERIFIED** | |
| No restricted destination/country support enabled | Config review | **NOT VERIFIED** | |

---

## 5. Cloud deployment verification

| Item | Required evidence | Status | Notes |
|------|-------------------|--------|-------|
| Hosting platform selected | Architecture decision / console | **NOT VERIFIED** | |
| API service deployed | Service list screenshot | **NOT VERIFIED** | Start command in repo: `server` → `npm start` (`node start.js`). |
| Worker deployed separately | Second service/process | **NOT VERIFIED** | `npm run worker:fulfillment`. |
| Env vars from secure host/vault | Injection UI (names only) | **NOT VERIFIED** | |
| No filled production `.env` committed | `git log` / scan | **NOT VERIFIED** | Example file may exist; verify no secrets in history. |
| `NODE_ENV=production` | Runtime config | **NOT VERIFIED** | |
| Managed PostgreSQL connected | Connection health + migration version | **NOT VERIFIED** | |
| Managed Redis connected | `/ready` or ops health | **NOT VERIFIED** | |
| Migrations applied | `prisma migrate deploy` audit in CI/CD or shell log | **NOT VERIFIED** | Use `npm run db:migrate` (wrapper) in `server`. |
| Health: `GET /health` | HTTP 200 snapshot | **NOT VERIFIED** | `server/src/routes/health.routes.js`. |
| Readiness: `GET /ready` | HTTP + JSON snapshot | **NOT VERIFIED** | |
| Metrics: `GET /metrics` if enabled | Prometheus scrape or curl | **NOT VERIFIED** | |
| Bull Board protected if enabled | Auth gate proof | **NOT VERIFIED** | |
| Admin endpoints protected | Auth + RBAC | **NOT VERIFIED** | |
| Logs visible in platform | Log drain screenshot | **NOT VERIFIED** | |
| Rollback plan tested or documented | Runbook | **NOT VERIFIED** | |

---

## 6. Domain / HTTPS / webhook verification

| Item | Required evidence | Status | Notes |
|------|-------------------|--------|-------|
| Production/staging domain | DNS record | **NOT VERIFIED** | |
| HTTPS certificate active | Browser or TLS checker | **NOT VERIFIED** | |
| Stripe webhook URL publicly reachable over HTTPS | Stripe Dashboard test send | **NOT VERIFIED** | |
| Webhook raw body preserved | Integration test in CI + **deployed** confirm | **NOT VERIFIED** | Code order verified by tests locally; prod must match. |
| Invalid signature → 4xx | Deliberate bad signature test | **NOT VERIFIED** | |
| Valid test webhook → 2xx | Dashboard delivery | **NOT VERIFIED** | |
| CORS production origins restricted | Deployed `CORS` config review | **NOT VERIFIED** | |
| No localhost CORS in production | Config | **NOT VERIFIED** | |
| DNS / rollback notes | Runbook | **NOT VERIFIED** | |

---

## 7. Staging environment verification

**Required staging setup (operator checklist):**

| Requirement | Notes |
|-------------|--------|
| Separate `DATABASE_URL` | No shared DB with prod. |
| Separate `REDIS_URL` | No shared queue with prod. |
| Stripe **test** mode only | Keys and Dashboard mode. |
| Reloadly **sandbox** or **mock** only | No live provider calls without approval. |
| Test user allowlist | e.g. owner emails. |
| `OWNER_ALLOWED_EMAIL` (or equivalent) | Per deployment docs. |
| `SOFT_LAUNCH_MODE=true` | As appropriate for staging rehearsal. |
| `FINANCIAL_SAFETY_LOCK_ENABLED=true` | Confirm against current env schema in `DEPLOYMENT_READINESS` / `.env.production.example` names. |
| `TRUST_SCORE_FULFILLMENT_BLOCK=true` | If required for gate. |
| `PROVIDER_TRUTH_LIVE_VERIFY` | Enable only when safe sandbox mode and explicit approval. |
| Run migrations | `npm run db:migrate` against staging DB. |
| Seed / required config | Per org procedure. |
| Smoke tests | §8 commands. |

---

## 8. Required staging test plan

Run from **`server/`** unless noted. **Expected:** commands exit 0; HTTP endpoints return documented success shapes.

| Step | Command / action | Expected result (high level) |
|------|------------------|------------------------------|
| Schema | `npx prisma validate` (from `server/`, Prisma on PATH) **or** `npm run db:validate` | Prisma schema validates. |
| Secrets scan | `npm run secrets:scan` | No committed secrets. |
| Production preflight (synthetic) | `npm run preflight:production` | Preflight script passes for configured env. |
| CI test bundle | `npm run test:ci` | Unit + integration (uses integration DB prep). |
| Integration only (if needed) | `npm run test:integration` | Money-path integration suite passes. |
| Load simulation | `npm run load:sim:prod-readiness` | Completes per script (may require local API on expected port — see `L20` docs). |
| Scale gate | `npm run gate:check:scale` | Gate script passes. |
| API liveness | `GET /health` | 200. |
| API readiness | `GET /ready` | 200 with expected snapshot fields. |
| Stripe webhook | Stripe CLI forward or Dashboard test to staging URL | 2xx; event in Dashboard. |
| Flutter smoke | `flutter test` / manual API smoke | Client talks to staging API. |
| OTP | Request + verify in configured mode | End-to-end auth smoke. |
| Checkout (test mode) | Complete Checkout session | Session completes in test. |
| Webhook → PAID → ledger → fulfillment | Trace one order in DB (read-only) | State transitions match handoff money path. |
| Mock / Reloadly sandbox fulfillment | Per `proof:*` scripts org approves | Provider correlation recorded. |
| Reconciliation tick | `npm run reconciliation:scan` or scheduled job | No unexpected orphans (triage if any). |
| Recovery orchestrator tick | Worker/API interval | Logs/metrics show bounded recovery. |
| Admin order inspection | Admin UI or API | Order visible; no auth bypass. |

**Do not** paste secrets into tickets or chat logs.

---

## 9. Live launch blockers

| Blocker | Severity | Why it matters | Required proof to close |
|---------|----------|----------------|-------------------------|
| Stripe account/payout not verified | **Critical** | Cannot collect or settle | Dashboard + capabilities |
| Reloadly live account not verified | **Critical** | Cannot fulfill real airtime | Provider account + sandbox→live checklist |
| Cloud deployment not verified | **Critical** | No production surface | Deploy logs + health checks |
| Managed DB/Redis not verified | **Critical** | Data loss / queue loss | HA plan + connection + backups |
| Webhook HTTPS / signature path not verified | **Critical** | Pay without ledger or double pay | End-to-end signed delivery |
| Staging E2E not passed | **Critical** | Unknown breakage | §8 all green on staging |
| Monitoring/alert routing not connected | **High** | Silent failures | Alert fired on synthetic incident |
| Support/admin runbook incomplete | **High** | Operational risk | Published runbook + drill |
| Real provider quotas unknown | **Medium** | Throttling at launch | Reloadly plan metrics |
| Refund/dispute flow not rehearsed | **High** | Customer/regulatory exposure | Tabletop + Stripe test |
| Compliance copy/site not externally reviewed | **High** | Legal/Stripe policy | Signed compliance review |

---

## 10. Soft launch go / no-go checklist

### GO only if

- [ ] Stripe **test** E2E passed on **staging** URL (Checkout + webhook + DB state).  
- [ ] Webhook delivery **2xx** and signature verification confirmed.  
- [ ] Ledger postings match payment events (operator spot-check + reconciliation).  
- [ ] Fulfillment **mock or sandbox** passed; provider correlation visible.  
- [ ] Recovery/reconciliation jobs ran without unbounded errors.  
- [ ] Admin / order inspection works; Bull Board/admin auth enforced.  
- [ ] Alerts/metrics visible to on-call path **or** explicit interim manual monitoring plan.  
- [ ] `npm run secrets:scan` clean on release artifact.  
- [ ] No live restricted-region support contrary to policy.  
- [ ] Owner-only or invite-only mode active (`SOFT_LAUNCH_MODE`, allowlists).  
- [ ] Rollback plan documented (disable traffic, revoke keys, DB pause if needed).  

### NO-GO if

- Any money-path test fails or leaves ambiguous order state.  
- Webhook signature mismatch or raw-body parsing regression.  
- Redis unavailable for required paths (queue/rate limits per config).  
- DB migration mismatch vs running code.  
- Provider truth unknown for the exercised flow.  
- Alerts invisible and no staffed alternative.  
- Admin cannot inspect or cancel stuck orders per runbook.  

---

## 11. Operator evidence checklist

**Please provide these redacted artifacts before go-live** (filenames or secure links; no secret values):

1. Stripe Dashboard — account status (restricted/OK).  
2. Stripe — webhook endpoint list showing `…/webhooks/stripe` and recent **test** delivery success.  
3. Stripe — test payment success (session/payment intent reference only).  
4. Reloadly — sandbox view showing **Afghanistan** operators (redacted).  
5. Reloadly — credential **presence** in vault (screenshot with values blacked out).  
6. Cloud — environment variable **names** list (values redacted).  
7. Cloud logs — API process startup lines (no secrets).  
8. `GET /health` and `GET /ready` responses (screenshot or paste JSON with secrets removed).  
9. Managed PostgreSQL — provider console “connected/healthy” (redacted).  
10. Managed Redis — provider console “connected/healthy” (redacted).  
11. Browser — HTTPS valid for production/staging domain.  
12. Soft-launch / safety flags — env UI showing toggles (redacted values).  

---

## 12. Final project summary — March 28 to May 6, 2026

Concise history (evidence: `git` themes + repo docs; not a forensic timeline):

- **Flutter** project established and iterated for wallet/telecom UX.  
- **Node** backend/API created (`server/`, Express app factory, health/ready/metrics).  
- **OTP / auth** (email OTP, rate limits, abuse protection).  
- **Stripe Checkout** integration for Phase 1 web top-up / checkout flows.  
- **Webhook** integration with raw-body mount ordering and verification tests.  
- **Local Stripe listener** flow documented (`STRIPE_LOCAL_WEBHOOK_FLOW`, proof scripts).  
- **Database / env** fixes (Prisma, integration DB, migration wrappers).  
- **Restricted-region compliance** middleware and checkpoints.  
- **Security hardening** (rate limits, secrets scan, mount-order tests, ops tokens).  
- **L1–L24 roadmap** closed per **`ZORA_WALAT_L_ROADMAP_CHECKPOINT.md`** with supporting `server/docs/L19`–`L24` and tests.  
- **Master handoff** authored: `ZORA_WALAT_MASTER_HANDOFF_2026-05-06.md`.  
- **External readiness audit** authored: this file.  

---

## 13. How future ChatGPT / agents should continue

1. Read **`ZORA_WALAT_MASTER_HANDOFF_2026-05-06.md`**.  
2. Read **`ZORA_WALAT_L_ROADMAP_CHECKPOINT.md`**.  
3. Read **`ZORA_WALAT_EXTERNAL_READINESS_AUDIT_2026-05-06.md`** (this file).  
4. Run **`git status`**; do not assume a clean tree.  
5. **Never** print secrets or `.env` values.  
6. **Never** run live Stripe charges or live Reloadly/provider calls unless the user explicitly approves for that session.  
7. **Do not** modify payment, ledger, webhook, or fulfillment **logic** unless the task explicitly requires it.  
8. Use **PASS/CLOSED** gate discipline for internal layers.  
9. If **external** evidence is missing, mark **NOT VERIFIED** — **do not** infer Dashboard or account state.  
10. Prefer **staging + test mode** for any new E2E.  

---

## 14. Final verdict (evidence-based)

**Verdict: INTERNAL ENGINEERING COMPLETE / EXTERNAL NOT VERIFIED**

**Rationale:** The repository and checkpoint files document **closed internal** L-gates, tests, and preflight scripts. This audit session did **not** access Stripe Dashboard, Reloadly Dashboard, or any deployed cloud environment; therefore **external** readiness items in §§3–7 are **NOT VERIFIED** and broad public launch is **not** supported by this document.

**Not claimed:** STAGING READY, SOFT LAUNCH READY, or PUBLIC LAUNCH READY — those require closing §10 **GO** items with operator evidence.

---

*No secrets in this file.*
