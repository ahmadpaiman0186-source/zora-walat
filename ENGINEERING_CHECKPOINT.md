# Engineering checkpoint (Zora-Walat)

## Post–Stripe account onboarding checkpoint — 2026-04-28 (no real-user launch)

**Purpose:** Safe checkpoint after Stripe onboarding. **Real live payments and real top-ups are not enabled** until you explicitly approve and configure production env.

**Stripe / account (operator attestation — no secrets here):**

- Stripe account onboarding **submitted**.
- Stripe indicates **payments may be accepted while account review is still pending** (subject to Stripe’s rules and risk controls).
- **Payouts remain pending** until review completes (expected).
- **Bank account connected** for payouts when Stripe approves.
- **2FA enabled** on Stripe Dashboard (and on any operator accounts with access).
- **No real-user launch yet** — treat as internal / dry-run only until launch checklist is complete.

**Technical guardrails (unchanged in this checkpoint):**

- Live `sk_live_` / `rk_live_` Stripe keys are **refused outside `NODE_ENV=production`** for hosted checkout and embedded PI paths (`server/src/config/stripeEnv.js`).
- Webhook handler **requires** valid `Stripe-Signature` + `constructEvent` before processing (`server/src/routes/stripeWebhook.routes.js`).
- **`PAYMENTS_LOCKDOWN_MODE`:** in code this is **`true` only when** `process.env.PAYMENTS_LOCKDOWN_MODE === 'true'` (`server/src/config/env.js`). **Unset = lockdown off.** For accidental-live protection, **keep `PAYMENTS_LOCKDOWN_MODE=true` in production secrets** until you deliberately disable it for go-live.
- Ledger immutability remains enforced (DB trigger + tests); re-run `npm --prefix server run test:ci` before any money-path change.

**Next human actions before any live money:**

1. Set production secrets (Stripe, Reloadly, DB, JWT) in the host’s secret store — **never** in git.
2. Confirm `PAYMENTS_LOCKDOWN_MODE` and `PRELAUNCH_LOCKDOWN` match your intended phase (lockdown on until launch).
3. Run full server + Flutter verification on the release candidate (see commands in section below when recorded).

---

## Security closeout checkpoint — 2026-04-26 (audit + CI green)

**Date:** 2026-04-26  
**Role:** Root security/stability audit only; no auth, webhook, lockdown, or rate-limit relaxations.

| Area | Result | Notes |
|------|--------|--------|
| SECURITY CHECK | **PASS** | Pattern scan: no committed live Stripe keys / real `whsec_` material; only docs, placeholders, test/smoke passwords. |
| SERVER (unit + CI) | **GREEN** | `npm --prefix server test`: 458 pass / 0 fail. `npm --prefix server run test:ci`: exit 0. |
| FLUTTER | **GREEN** | `flutter test`: all passed (17). `flutter analyze`: no issues. |
| MONEY PATH (local pricing) | **GREEN** | `npm --prefix server run verify:local-pricing`: exit 0; `sumEqualsTotal: true`; `totalUsdCents: 226`; `zoraServiceFeeUsdCents: 26`; `feePolicyVersion: phase1_margin_search_min_zora_fee_v1`. |

**Recent security/payment-related HEAD (pre closeout commit):** `55d3138` — `fix(ci): JWT fallback + rate-limit CI safe + correct 403 vs 503 ordering`  
**Files in that commit:** `server/src/controllers/paymentController.js`, `server/src/middleware/rateLimits.js`, `server/test/integrations/testDatabaseResolution.mjs`

**Commands run (this closeout):**

- `git status --short`
- Repo grep for high-risk secret patterns (Stripe live keys, whsec, etc.)
- `npm --prefix server test`
- `npm --prefix server run test:ci`
- `npm --prefix server run verify:local-pricing`
- `flutter test`
- `flutter analyze`

**Artifacts updated:** `SESSION_STATE.txt` (new/updated), this section in `ENGINEERING_CHECKPOINT.md`  
**Commit message (checkpoint):** `chore: final security closeout checkpoint`  
**Push:** not performed (per operator request).

**Tomorrow resume:** Same as `SESSION_STATE.txt` — optional remote CI after push; re-run the five commands before any payment or release merge; keep webhook secret aligned with `stripe listen`.

---

## Emergency local dev stabilization — 2026-04-26 (15 min timebox)

**Timestamp (UTC-7):** 2026-04-26 (session)  
**HEAD at write:** `ee413829cf03495fce23b4ec5e11bbc4eb7d896b` (branch `2026-04-11-qrw0`; other WIP may exist in working tree)

**KPI (operator to verify on machine):**

| KPI | Status | Notes |
|-----|--------|--------|
| `GET http://127.0.0.1:8787/health` → `{"status":"ok"}` | **NOT re-run here** | Start API: `cd server && npm start` (PORT default 8787) |
| Next.js `http://localhost:3000` without “Cannot reach the API” | **Config** | Root `.env.local` should set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8787`. **CORS:** set `CORS_ORIGINS` to include `http://localhost:3000` and `http://127.0.0.1:3000` (see `server/.env.local.example`); for this workspace a line was added in **local** `server/.env` (gitignored) |
| OTP / email | **PASS (code path)** | `server/services/emailService.js` now honors **`OTP_TRANSPORT=console`** in `sendOTP` — logs OTP to stdout (no SMTP). Ensure `server/.env` or `.env.local` has `OTP_TRANSPORT=console` for dev. |
| Prisma | **PASS** | `cd server && npx prisma generate` — exit 0, client generated. `DATABASE_URL` read from `server/.env` when present. Studio: `cd server && npm run db:studio` (default browser port **5555**; use `prisma studio --port 5556` if you require 5556). |

**Commands executed (this session):**

- `cd server && npx prisma generate` → success.

**Files changed in repo (stabilization slice, committed separately):**

- `server/.env.local.example` — document `CORS_ORIGINS` for Next (:3000) → API (:8787).
- `server/services/emailService.js` — `OTP_TRANSPORT=console` handling in `sendOTP`.

**Skipped (timebox / policy):**

- `taskkill /F /IM node.exe` and port checks — **not run** (destructive; operator should free 3000/8787 as needed).
- `npm start` + curl `/health` — not run in this environment (no long-lived server in tool session).
- Full Next `build && start` — not run.
- `git push` — not requested; CI may still be red.

**Remaining blockers:**

- **GitHub CI** integration failure (`apiContractAuthFlow`) noted in 2026-04-25 section — **out of scope** for this stabilization.

---

## Mandatory checkpoint & freeze — 2026-04-25 (evidence only)

**Branch:** `2026-04-11-qrw0`  
**Latest commit hash (local HEAD):** `3d3469c97d9d84cacb6a4ab7b24802a6a163b035`  
**Pushed commit hash (origin/2026-04-11-qrw0):** `3d3469c97d9d84cacb6a4ab7b24802a6a163b035`  
**Working tree:** clean (`git status` shows nothing to commit)  

**Local tests (PowerShell / Windows):**

- `npm test`: **458 pass / 0 fail** (unit suite)

**GitHub CI current blocker (do not merge until green):**

- **Job**: `CI / server` failed
- **Failing test**: `apiContractAuthFlow.integration.test.js`
- **Symptom**: signup → verify-otp → `GET /api/wallet/balance` returns **500** (expected **201**)

**Security lockdown expectation (already supported; do not bypass):**

- Production/operator mode should set:
  - `OWNER_ALLOWED_EMAIL=ahmadpaiman0186@gmail.com`
  - `PAYMENTS_LOCKDOWN_MODE=true`
- `PAYMENTS_LOCKDOWN_MODE=true` must block **new money creation** routes (checkout/top-up/recharge) while keeping Stripe webhooks intact.
- `OWNER_ALLOWED_EMAIL` (when set) must enforce **owner-only** access for protected/admin/owner flows.

**Date (authoritative per session):** 2026-04-23  
**Repository HEAD at checkpoint write time:** `de487f84fa9d3bf3ec66bf5fc3617153abc603c1` (branch `2026-04-11-qrw0`)

This file is a **resumable baseline**: how to start the API, what was verified in this pass, and what remains unproven. It is not a “green light” for production; it is an evidence snapshot.

---

## Mandatory checkpoint & freeze — 2026-04-23 (evidence only)

| Check | Result | Evidence |
|--------|--------|----------|
| `GET /health` | **PASS** | `{"status":"ok"}` → `server/debug/session-20260423-1423/health.json` |
| `npm run verify:local-pricing` | **PASS** | Exit 0; `zoraServiceFeeUsdCents=26`, `totalUsdCents=226`, `feePolicyVersion=phase1_margin_search_min_zora_fee_v1` → `verify-local-pricing.txt` (named `.txt` so it can be committed; `*.log` is gitignored) |
| `npm run auth:check-user` | **PASS (eligibility)** | User exists, `isActive: true` → `otp-check-user.txt` in same folder |
| `npm run auth:probe-otp` | **PARTIAL** | Stub path: **PASS** (tokens). Real SMTP: **FAIL** `EAUTH` / Gmail `535-5.7.8` BadCredentials → `otp-probe.txt` + full lines in `otp-check-user.txt` / probe console |
| Port **8787** | **PASS (single listener)** | PID **9396** `node start.js` (IPv4+IPv6 same PID) → `ports-8787.txt` |
| **Stripe CLI** | **RISK** | **3** `stripe` processes (PIDs 2316, 6848, 16312) — avoid multiple `stripe listen` / `whsec` drift; keep one forwarder. → `processes.json` / `stripe-cli-processes.json` |
| Webhook / security | **Not modified** | No change to signature verification or flags in this checkpoint |

**Snapshot path:** `server/debug/session-20260423-1423/`  
**Artifacts:** `health.json`, `verify-local-pricing.txt`, `otp-probe.txt`, `otp-check-user.txt`, `processes.json`, `env-redacted.txt`, `git-state.txt`, `startup.txt` (partial — full `npm start` banner not re-captured), `ports-8787.txt`, `processes-raw.json`, `stripe-cli-processes.json`

**Commands executed (exact):**

```powershell
Set-Location c:\Users\ahmad\zora_walat\server
# Pre-existing API on :8787 assumed; then:
Invoke-WebRequest http://127.0.0.1:8787/health
npm run verify:local-pricing
npm run auth:check-user
npm run auth:probe-otp
netstat -ano | findstr :8787
# + process listing for node.exe / stripe
```

**Known issues (2026-04-23):**

- **SMTP:** Gmail rejects credentials (`EAUTH`, 535) until `EMAIL_PASS` in `server/.env.local` is a **valid 16-char app password** (Account → Security → App passwords). Stub OTP+verify still proves application auth logic.
- **Multiple `stripe` processes:** consolidate to one `stripe listen --forward-to http://127.0.0.1:8787/webhooks/stripe` and match `STRIPE_WEBHOOK_SECRET` to that session.

**Resume tomorrow (minimal):**

```powershell
Set-Location c:\Users\ahmad\zora_walat\server
npm start
# other terminal:
npm run verify:local-pricing
npm run auth:check-user
# optional: npm run auth:probe-otp
```

**Risk notes:** Stale Node on 8787 — always match `netstat` PID to the `node start.js` you just started. `.env.local` overrides `.env` for duplicate keys; restart API after any `STRIPE_WEBHOOK_SECRET` or `EMAIL_PASS` change.

---

## 1) Run order (local, PowerShell)

1. `Set-Location c:\Users\ahmad\zora_walat\server`
2. `npm start` (or `node start.js` — `package.json` `main` is `start.js`; do not use legacy shims if your workflow forbids it).

**Env precedence (confirmed in `server/bootstrap.js`):** `server/.env` is loaded first; `server/.env.local` (if present) is loaded **after** and **overrides** duplicate keys. Startup logs a reminder when both exist. After changing `STRIPE_WEBHOOK_SECRET` or any overridden key, **restart Node** so the running process matches the file you edited.

**Flutter debug API base:** `lib/main.dart` — when `API_BASE_URL` is empty in debug, the app targets `http://127.0.0.1:8787` (align with the API’s `PORT`, default 8787).

---

## 2) New operational smoke (avoids “stale Node / stale code” false confidence)

From `server/`, with the API **already listening**:

```powershell
npm run verify:local-pricing
```

**Script:** `server/scripts/verify-local-pricing-runtime.mjs`  
**Behavior:** `POST` `http://127.0.0.1:8787/api/checkout-pricing-quote` with a fixed $2 / US / roshan payload. Asserts breakdown arithmetic (`product + fee + tax === total`), **non-zero** `zoraServiceFeeUsdCents` under the expected healthy defaults, and prints `feePolicyVersion` (expected to include the min-fee policy id when the current build is running).

**This run (evidence, 2026-04-22):**

- `zoraServiceFeeUsdCents`: 26  
- `totalUsdCents`: 226 (200 + 26 + 0)  
- `sumEqualsTotal`: true  
- `feePolicyVersion`: `phase1_margin_search_min_zora_fee_v1`

If this fails with connection errors, the API is not running on `PORT`. If it passes with **fee 0** or a **suspicious** `feePolicyVersion`, suspect wrong env, **stale** Node process, or a pathological `PRICING_*` / `PHASE1_*` configuration — compare startup `[pricing] phase1MinZoraServiceFeeBps=...` and `amountOnlyProviderBps=...` lines in `server/src/runtime/serverLifecycle.js`.

---

## 3) Automated tests executed in this pass (one command at a time)

| Command | Result |
|--------|--------|
| `Set-Location server; node --test --test-concurrency=1 test/stage1UnifiedPricingParity.test.js` | **6 passed, 0 failed** |
| `flutter analyze` on `lib/main.dart`, `lib/services/api_service.dart`, `lib/features/recharge/presentation/recharge_review_screen.dart` | **No issues found** |

**Not run in this pass (explicit gap):** full `npm test` for entire `server/`, `npm run test:integration`, Flutter full-project analyze, `stripe listen` + webhook e2e, device/browser E2E for checkout → success screen.

---

## 4) Audit findings (truthful, severity)

| Severity | Finding | Status / note |
|----------|---------|----------------|
| **HIGH (operational)** | **Stale Node** on the listen port (e.g. 8787) can serve **old** pricing code or old env, while the developer believes they restarted. | **Mitigation in repo:** `verify:local-pricing` + startup `[pricing]` logs. **Manual:** match logged `node pid=…` to the process bound to the port. |
| **HIGH (config)** | `STRIPE_WEBHOOK_SECRET` and other duplicates: `.env.local` wins; `stripe listen` must match the **active** whsec. | **Documented at startup** in env bootstrap. **No code change** required if operators follow restart discipline. |
| **MEDIUM** | Liveness/health is minimal JSON (`sendLivenessJsonOk`) — no pricing or config echo. | **By design** for liveness; use startup logs + quote smoke for config truth. |
| **MEDIUM** | `PHASE1_GOVERNMENT_SALES_TAX_BPS_BY_SENDER` unset → 0% tax for all senders until configured. | **Observable** in startup log; not a bug if Stage 1 policy is intentional. |
| **MEDIUM (repo hygiene)** | Untracked `server/debug/` and similar may hold **local** logs or env fragments. | **Do not** add secrets; review before any commit; consider adding to `.gitignore` if these are always local-only. |
| **INFO** | `POST` `checkout-pricing-quote` registered twice in express inventory (root + `/api` paths) — same handler, two paths. | **Expected** per `moneyRoutePolicy` / `paymentController` comments. |

**CRITICAL (none newly confirmed in this pass):** No new CRITICAL defect was **proven** beyond known operational class (stale process / webhook mismatch), which are mitigated by runbook behavior and existing logging — not a silent code bug fixed here without a broader integration proof.

**Unresolved (explicit):**

- End-to-end Stripe Checkout + webhook + order snapshot parity in **your** live dev stack was not re-run for this document.
- Full server unit test matrix and integration suite not executed here.

---

## 5) Saving “tomorrow’s” exact state (recommended)

The working tree had **many** modified and untracked files at checkpoint time. To resume from a **known-good** commit:

1. Review `git status` and exclude anything that must not be committed (secrets, `server/debug/*`, one-off `tmp-*.json`).
2. `git add` the intended set and `git commit -m "…"`.
3. Tag optionally: `git tag checkpoint-2026-04-22` or note the new commit hash in this file’s **Next edit** line.

**Next edit:** append new HEAD hash, verification commands, and results after the next hardening / PR merge.

---

## 6) In-scope files added/changed in this small hardening slice

- `server/scripts/verify-local-pricing-runtime.mjs` — new
- `server/package.json` — `verify:local-pricing` script

`ENGINEERING_CHECKPOINT.md` — this checkpoint (user-requested; safe continuation artifact).

---

## 7) Session finalization (2026-04-22) — full state & reproducibility

**Git (at session close):**

- **HEAD:** `de487f84fa9d3bf3ec66bf5fc3617153abc603c1`
- **Branch:** `2026-04-11-qrw0`
- **Stability note:** The tree is **not** clean: many **modified** and **untracked** paths (see `git status` at close). Reproducibility = same **commit** + same **working copy** (or a **commit** that includes your intended WIP). Do not assume “clean main” until you commit/tag.

**Env (no secret values here):**

- **Backend:** `server/.env` then `server/.env.local` (override). Template / hints: `server/.env.local.example`.
- **App root:** e.g. `.env` / `.env.local` for Flutter—keep **local** keys out of version control; align `API_BASE_URL` with the API you intend to hit.
- **Stripe webhook:** `STRIPE_WEBHOOK_SECRET` must match the **active** `stripe listen` session; restart the API after whsec change.

**Runtime assumptions:**

- **Node** `>=20` (see `server/package.json` `engines`).
- **Entry:** from `server/`, `npm start` → `node start.js` (see `package.json` `start` / `main`).
- **Port:** `PORT` if set, else default **8787** (Flutter debug default in `lib/main.dart` is `http://127.0.0.1:8787` when `API_BASE_URL` is empty).
- **DB:** PostgreSQL reachable (startup logs when API runs).
- **Idempotency / webhooks / payment rules:** not altered in this checkpoint doc (preserve invariants in code; review before merge).

**Exact commands — restart API + verify (PowerShell, tomorrow):**

```powershell
# Terminal A — API
Set-Location c:\Users\ahmad\zora_walat\server
npm start
```

```powershell
# Terminal B — after you see the server listening on 8787 (or your PORT)
Set-Location c:\Users\ahmad\zora_walat\server
npm run verify:local-pricing
```

Optional: `Set-Location c:\Users\ahmad\zora_walat\server; node --test --test-concurrency=1 test/stage1UnifiedPricingParity.test.js` (no server required).

**This document path:** `c:\Users\ahmad\zora_walat\ENGINEERING_CHECKPOINT.md`

---

## 8) Phase 1 delivery pipeline (local sandbox, 2026-04-23)

**Code path (summary):** `POST /webhooks/stripe` → `applyPhase1CheckoutSessionCompleted` → `ensureQueuedFulfillmentAttempt` → (post-tx) `scheduleFulfillmentProcessing` → either **BullMQ enqueue** (`enqueuePhase1FulfillmentJob`) when `FULFILLMENT_QUEUE_ENABLED=true` **and** `REDIS_URL` set, or **inline** `processFulfillmentForOrder` in the API process. Worker runtime (`fulfillment-worker.mjs`) owns the BullMQ consumer and the `processPendingPaidOrders` drain interval — **not** `npm start` alone.

**`airtime=mock` in startup:** `AIRTIME_PROVIDER` defaults to `mock` when unset (`env.js` / `phase1AirtimeConfig.js`). Mock adapter returns success quickly; it is **not** the primary explanation for indefinite “Preparing” when the order never leaves `PAID`+`QUEUED`.

**Local trap:** Queue on + API only → jobs sit in Redis → UI “Preparing” / execute **504** until `npm run worker:fulfillment` runs. Prefer `FULFILLMENT_QUEUE_ENABLED=false` for single-terminal dev, or run the worker in a second terminal. API startup now logs **`[fulfillment]`** lines describing this.

**Flutter:** `POST /api/recharge/execute` may return **504** when the server waits for terminal fulfillment in queue mode; `ApiService` and `SuccessScreen` treat 504 as a structured in-progress response (not a thrown transport error).

## NEXT SESSION PLAN
1. Start API → `cd server && npm start`
2. Verify → `GET /health` (expect `http://127.0.0.1:8787/health` → `{"status":"ok"}`)
3. Start frontend → from repo root `npm run dev` (port **3000**)
4. Test OTP (console output) — `OTP_TRANSPORT=console`; watch API log for code after `request-otp`
5. Resume payment flow debugging

