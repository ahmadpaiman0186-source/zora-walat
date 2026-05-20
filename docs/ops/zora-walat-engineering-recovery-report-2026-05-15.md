# Zora-Walat Engineering Recovery Report — March 28 to May 15, 2026

## 1. Executive Summary

- **Built (Mar 28 → May 15):** A **monorepo** combining **Next.js** (marketing / top-up UI), **Flutter** client libraries, and a **Node 20+ Express API** in **`server/`** with **Prisma** (PostgreSQL), **Stripe** (checkout, webhooks, Payment Element paths), **Reloadly-oriented** airtime/webtopup provider plumbing, **OTP/auth**, **restricted-region compliance**, **ledger / money-path** orchestration, **canonical transaction** projection, **observability** scripts, and extensive **unit/integration** coverage. **Vercel** was used early for **Next/Flutter web**; the **API** is packaged for Vercel **serverless** via **`server/api/index.mjs`** → **`λ api/index`**.
- **Deployed:** **Staging API** project **`zora-walat-api-staging`**; correct artifact path is **`C:\Users\ahmad\zora_walat\server`** with **`server/vercel.json`** routing **`^/(.*)$` → `/api/index.mjs`**. Production alias: **`https://zora-walat-api-staging.vercel.app`** (currently **`● Ready`**, **`dpl_APsS5GAztzmHn459vJfDc8STaqVS`**, unique URL **`https://zora-walat-api-staging-2ju30totj.vercel.app`**).
- **Broke:** **(a)** **Root-directory** `vercel deploy --prod` shipped **Next.js** to the **API** domain (wrong artifact). **(b)** **`server/.env`** was **uploaded** with server deploys, **shadowing** Vercel env and causing **Stripe / DB** fatals. **(c)** **Redis-backed** limiter before **Zod** on **`checkout-pricing-quote`** caused **timeouts** on invalid bodies. **(d)** Current: **`DATABASE_URL`** is **set** in Vercel but **fails PostgreSQL URI scheme validation** → **`process.exit(1)`** → **`FUNCTION_INVOCATION_FAILED`** on **`/api/index`**.
- **Fixed:** **Promoted** last good **`λ api/index`** deployment after wrong-root incident; **`server/.vercelignore`** to stop **`.env*`** uploads; **middleware reorder** for **`checkout-pricing-quote`**; **slim `/ready`** and **bounded DB probes**; **slim Stripe webhook** signature path; **`fatal_startup_gate`** diagnostics; **`normalizeDatabaseUrlEnv`** for BOM/quotes; **Next/Vercel** build hardening at repo root for the **marketing** app.
- **Still blocked:** **Vercel Production `DATABASE_URL`** must be a **`postgres://` or `postgresql://`** URI (not JDBC, host-only, wrong protocol, or malformed). Until then, **`GET/HEAD /api/index`** returns **500** / **`FUNCTION_INVOCATION_FAILED`**.
- **CTO recommendation:** **Stabilize staging API boot first** (fix **`DATABASE_URL`** shape, redeploy from **`server/`**, **`curl`** + **`/ready`** + webhook smoke). **Freeze feature work** until boot is green. **Rotate** any credential class that may have been in a bundled **`.env`** or in logs. **Keep Stripe test mode** on staging unless explicitly approved. **Mock providers** only with **`ALLOW_MOCK_AIRTIME_IN_PRODUCTION`** / **`ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION`** and clear product sign-off.

---

## 2. Project Start Context — March 28

_Reconstructed from git history (`--since=2026-03-28`) and repository layout._

- **Initial architecture:** **Monorepo** — **Next.js** app at **root** (`app/`, `vercel.json` with **`framework: nextjs`**), **API** in **`server/`** (Express, Prisma, Stripe, webhooks, money path). **Flutter** under **`lib/`** for mobile/web client.
- **Product direction:** **Field-style telecom top-up** — airtime / data packages, **checkout**, **compliance** (restricted regions / dial probes), **wallet / ledger** concepts, **webtopup** fulfillment path, **OTP** identity.
- **Backend intent:** **REST API** on Node (**default local port 8787** in docs), **Stripe** for payments, **Postgres** via **Prisma**, optional **Redis** for queues/rate limits.
- **Stripe / payment:** Hosted checkout and **webhook-driven** state transitions; later **slim serverless** path verifies **Stripe-Signature** before full bootstrap on Vercel.
- **Database:** **PostgreSQL** only; **Prisma migrations** and **integration** DB for CI.
- **Early Vercel note:** Commits **`30709a0`** (*fix vercel deployment with nextjs root app*), **`bfb31b2`** (*Deploy Flutter web to Vercel*), and **`6ce1351`** (*Stripe payment service removal / API base URL realignment*) establish that **root** Vercel config targets the **Next** surface — a recurring source of **API vs frontend** confusion if the **wrong cwd** is used for **`zora-walat-api-staging`**.

---

## 3. Timeline: March 28 → May 15

_Grouped chronologically; dates from commit **AuthorDate** where shown._

### Late March — early April 2026

| When | Theme | Representative commits / artifacts |
|------|--------|-------------------------------------|
| **~Mar 28 → Apr** | **Vercel + client packaging**, Stripe surface realignment | **`6ce1351`**, **`bfb31b2`**, **`30709a0`** — Next/Flutter on Vercel; API URL configuration shifts. |
| **Apr 11 →** | **Sprint stabilization**, money path, CI, lockdown | Merge **`0ddd08c`** / PR **`2026-04-11-qrw0`** chain (**`2470a57`** Phase1 dial/amount/checkout, **`3313845`** Stripe live key fail-closed, integration DB invariants). |
| **Apr** | **Phase 1** observability, retry, reconciliation | **`49a5b5c`**, **`620a195`**, **`c714446`**, **`bb63e20`**. |
| **Apr** | **Security / compliance**, restricted regions, Stripe-safe | **`6228f5e`**, **`5ebea0b`**, **`32448bf`**, **`2583597`**, **`f10432c`**. |
| **Apr 29 – May 2** | **Super-system**, UI, canonical ledger, OTP | **`4137bb3`**, **`61d52f6`**, **`7078e7f`**, **`dded999`**, **`99b7f9f`**. |

### May 6–15, 2026

| When | Theme | Representative commits |
|------|--------|-------------------------|
| **May 6** | **Handoff / readiness docs**, CI, external audit markdown | **`e47fcd1`**, **`3bbd1e0`**, **`98d26fc`**. |
| **May 7** | **Backup/restore** runbook merge | **`b84e5c1`**, **`5052b9f`**. |
| **May 9** | **Serverless readiness** bounds, Vercel ignore tweak | **`8f4f65f`**, **`81e7bbe`**. |
| **May 11–12** | **Slim `/ready`**, safe **`db_error`** logs, **slim Stripe webhook** gate | **`cb1f291`**, **`b7c7e6a`**, **`5a5d8d5`**, **`d99f241`**. |
| **May 13** | **Next.js** Vercel build fixes (root app) | **`e67caad`**, **`3058f70`**, **`7d662fd`**, **`5f00438`**. |
| **May 13** | **API** checkout quote **fail-fast** before Redis | **`910b921`**. |
| **May 14–15** | **Staging recovery**: **`.vercelignore`**, **`DATABASE_URL`** gate diagnostics + normalization | **`55ae1be`**, **`8bfd850`**, **`73e49df`**, **`a3b6731`**. |

### Operational / Vercel incidents (May 12–15, not all in git)

- **Wrong artifact on API domain** — **`vercel deploy --prod`** from **monorepo root** applied **Next** `vercel.json` to **`zora-walat-api-staging`** → **`/health`/`/ready` 404** HTML. **Recovery:** promote last deployment whose inspect showed **`λ api/index`** only.
- **`.env` bundled** — Lambda logs showed **dotenv injecting many keys** from **`.env`**. **Recovery:** **`server/.vercelignore`** excluding **`.env*`**; later logs show **0 keys** from **`.env`** (ENOENT on `/var/task/.env`).
- **Stripe / DB fatals** during recovery — mitigated by **Vercel env resets** + **no local `.env` shadowing`**.
- **Current:** **`fatal_startup_gate`** → **`passesPostgresSchemeCheck: false`** for **`DATABASE_URL`**.

---

## 4. Architecture Evolution

- **Monorepo:** **Root** = Next UI + scripts; **`server/`** = API + Prisma + serverless **`api/`** tree; **`lib/`** = Flutter.
- **Vercel serverless API:** **`server/vercel.json`** routes all paths to **`/api/index.mjs`**, which wraps **Express** via **`serverless-http`**, with **fast paths** for **`/health`**, slim **`/ready`**, and **Stripe webhook POST** before full graph where implemented.
- **`/api/index`:** Vercel’s path to the **serverless function**; **500** today = **Node exit during startup**, not “route missing.”
- **Webhooks:** Express **`/webhooks/stripe`**; **slim** entry verifies **signature** early on Vercel.
- **Stripe:** **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, **`ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION`**, **`CLIENT_URL`** — validated in **`serverLifecycle`** / **`stripeEnv`**.
- **Database:** **Prisma** + **`DATABASE_URL`**; **`db.js`** applies optional **`PRISMA_CONNECTION_LIMIT`**.
- **Providers:** **`AIRTIME_PROVIDER`**, **`WEBTOPUP_FULFILLMENT_PROVIDER`** (default **`mock`** in code paths if unset); **Reloadly** when selected requires **`RELOADLY_*`** credentials.
- **Mock policy:** **`productionSafetyGates.js`** — mock in **`NODE_ENV=production`** requires **`ALLOW_MOCK_AIRTIME_IN_PRODUCTION`** / **`ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION`**.
- **Startup gates:** **`validateServerRuntimeOrExit`** — JWT → **`logLaunchValidation`** (includes **`provider_config_validated`**) → **`validateDatabaseConfigOrExit`** (Postgres URI + Stripe + CORS + TTL) → owner/CORS/horizontal contract → topology log.

---

## 5. Incident History

| Phase / date | Symptom | Root cause | Evidence | Fix | Result | Residual risk |
|--------------|---------|------------|----------|-----|--------|----------------|
| **May 12–14** | API domain **404** HTML, **`/health`** wrong | **Root `vercel deploy`** used **Next** build | Inspect: **Next lambdas** vs **`λ api/index`** | **Promote** good **`api/index`** deployment; document **`server/`** cwd | Alias serves API again | Repeat wrong cwd |
| **May 14–15** | **Stripe/DB** fatals, dotenv **(N)** keys | **`server/.env`** in upload | Logs: **injecting env from `.env`** on Lambda | **`server/.vercelignore`** | **(0)** keys / ENOENT | None if ignore stays |
| **May** | **`checkout-pricing-quote`** **timeout** | **`apiIpLimiter`** (optional Redis) **before** **`validateRequest`** | Prod timeout ~25s | **`910b921`** reorder | **400** fast on bad body | Redis latency on valid traffic |
| **May** | **`/ready` 503** `db_error` | Prisma **`select_1`** init / DB | **`[slim-ready-db-error]`** logs | Slim handler + diagnostics (not env here) | Separate from Next mis-deploy | Needs valid **DB** |
| **May 15** | **`/api/index` 500** **`FUNCTION_INVOCATION_FAILED`** | **`DATABASE_URL`** **not** `postgres(ql)://` after normalization | **`fatal_startup_gate`**: `hasNonWhitespaceDatabaseUrl: true`, `passesPostgresSchemeCheck: false` | **Operator** replaces URI; code adds **normalize + JSON gate** | Still **blocked** until URI fixed | Wrong DSN class pasted in Vercel |
| **Ongoing** | **Git author** variance (`ahmad` vs `ahmadpaiman0186-source`) | Multiple identities / machines | Commit log | Align **git config** + **Vercel Git** integration | Policy/process | Audit trail noise |
| **Clarified** | “Mock blocked boot?” | Logs show **`provider_config_validated`** before DB fatal | Order of **`assertProductionMoneyPathSafetyOrExit`** vs **`validateDatabaseConfigOrExit`** | N/A (education) | Mock **not** current blocker | Mock still needs **`ALLOW_MOCK_*`** if used |
| **Clarified** | “Stripe blocked boot?” | Latest fatals are **`DATABASE_URL`** scheme | **`[fatal] DATABASE_URL must be…`** after provider log | N/A | Stripe **not** current terminal gate | Still validate **`STRIPE_SECRET_KEY`** / **`whsec_`** after DB fix |

---

## 6. Current Confirmed State

| Item | Value |
|------|--------|
| **Vercel project** | **`zora-walat-api-staging`** |
| **Deploy path (required)** | **`C:\Users\ahmad\zora_walat\server`** |
| **Production alias** | **`https://zora-walat-api-staging.vercel.app`** |
| **Current deployment (alias)** | **`dpl_APsS5GAztzmHn459vJfDc8STaqVS`** — **`● Ready`** — **`https://zora-walat-api-staging-2ju30totj.vercel.app`** |
| **Build artifact** | **`λ api/index`** (not Next page lambdas) |
| **Failing endpoint** | **`https://zora-walat-api-staging.vercel.app/api/index`** (**500** / **`FUNCTION_INVOCATION_FAILED`**) |
| **Blocker** | **`DATABASE_URL`** **invalid URI scheme** for production gate |
| **Env names present (Production)** | **`DATABASE_URL`**, **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, **`JWT_ACCESS_SECRET`**, **`JWT_REFRESH_SECRET`**, **`CLIENT_URL`**, **`CORS_ORIGINS`**, **`PRELAUNCH_LOCKDOWN`**, **`ACCESS_TOKEN_TTL`**, **`REFRESH_TOKEN_TTL`**, **`AIRTIME_PROVIDER`**, **`WEBTOPUP_FULFILLMENT_PROVIDER`**, **`ALLOW_MOCK_AIRTIME_IN_PRODUCTION`**, **`ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION`**, **`FULFILLMENT_QUEUE_ENABLED`**, **`RELOADLY_SANDBOX`**, **`DEV_CHECKOUT_AUTH_BYPASS`**, **`CORS_DEBUG_LOG`**, **`ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION`**, **`NODE_ENV`** |
| **Shape risk (no values)** | **`DATABASE_URL`** listed as **Encrypted** but **fails** `postgres://` / `postgresql://` check → treat as **wrong format** until replaced |

---

## 7. Code Changes Since March 28 (recovery-relevant subset)

| Area | Why | Risk reduced | Remaining concern |
|------|-----|--------------|-------------------|
| **`server/.vercelignore`** | Stop **`.env*`** upload | Secret leakage / env shadowing | Other accidental secret files in tree |
| **`serverLifecycle` / `fatal_startup_gate`** | Explain **DB URI** boot failures without leaking URL | Time-to-diagnose | Operators must read JSON + message |
| **`normalizeDatabaseUrlEnv` + `db.js`** | BOM / wrapping quotes | False negatives on scheme check | Still fails if protocol is not Postgres |
| **`payment.routes.js` (`910b921`)** | Validate body before **Redis** limiter | Hang on bad JSON | Redis health for valid traffic |
| **`server/api/index.mjs` + slim handlers`** | **/ready** + **webhook** without full bootstrap stall | Serverless cold start | DB/Stripe still must be correct |
| **`readinessBoundedChecks.js`** | Safe **`[slim-ready-db-error]`** fields | Blind `db_error` | Still need DBA for real DB failures |
| **Root Next / `vercel.json` / `next.config.mjs`** | Marketing app builds on Vercel | Wrong-root confusion slightly reduced with docs | **Never** use root deploy for **API** project |

---

## 8. Security Review

- **Secrets:** Never commit **`server/.env*`**; use **Vercel** for staging/production runtime. **`.vercelignore`** mitigates upload.
- **Stripe live vs test:** Staging should use **`sk_test_` / `rk_test_`** + matching **`STRIPE_WEBHOOK_SECRET`**; respect **`ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION`** policy.
- **Vercel env:** Names visible in **`vercel env ls`**; values **Encrypted** — still **rotate** if compromise suspected.
- **Logs:** Avoid printing **connection strings** or **full** Stripe materials; bootstrap historically logged **webhook secret tail** — treat logs as **semi-sensitive**.
- **Rotation:** If **`.env`** was ever deployed or secrets logged, **rotate** **`DATABASE_URL`** password, **`STRIPE_*`**, **`JWT_*`**, and any **admin** tokens per policy.
- **Operator discipline:** **Paste URIs** into Vercel UI/CLI only; **never** into chat or tickets.

---

## 9. Production Readiness Matrix

| Area | Current status | Risk | Required action | Owner |
|------|------------------|------|-----------------|-------|
| **API boot** | **Red** (DB URI scheme) | **500** | Fix **`DATABASE_URL`** | Ops |
| **Vercel deployment path** | **Green** if **`server/`** used | Wrong artifact | Document + enforce cwd | Eng |
| **`DATABASE_URL`** | **Red** (shape) | Prisma / gate fail | Full **Postgres URI** in Vercel | Ops |
| **`STRIPE_SECRET_KEY`** | **Unknown** post-resets | Live charges | Confirm **test** key + policy | Ops |
| **`STRIPE_WEBHOOK_SECRET`** | **Unknown** | Signature failures | Match **staging** endpoint secret | Ops |
| **Webhook route** | **Code ready** | Not proven this week | Signed test event | Eng |
| **Payment flow** | **Blocked** by API boot | No E2E | After boot, smoke checkout | Eng |
| **Provider config** | **Mock** in recent logs | Sandbox realism | Reloadly sandbox or explicit mock allow | Product + Eng |
| **Mock providers** | **Gated** | Accidental mock prod | **`ALLOW_MOCK_*`** when mock | Eng |
| **Migrations/schema** | **Not executed here** | Drift | Run **`db:migrate`** against staging DB when URI fixed | Ops |
| **Observability / logs** | **Improved** | Leakage | Redaction policy | Eng |
| **Rollback** | **`vercel promote`** | Wrong `dpl` | Keep inspect notes per good build | Eng |
| **Git hygiene** | Branch **ahead** of remote | Drift | PR / push after review | Eng |
| **Secrets hygiene** | **Better** post-ignore | Past `.env` upload | Rotate if indicated | SecOps |

---

## 10. Current Blocker Deep Dive

- **`DATABASE_URL`** is **present** in Vercel (**name** listed; runtime has **non-whitespace** value after **BOM/quote** normalization).
- **Required shape:** must match **`/^postgres(ql)?:\/\//i`** after normalization — i.e. **`postgres://…`** or **`postgresql://…`**.
- **Not acceptable:** JDBC (`jdbc:postgresql:`), **host-only**, **non-Postgres** protocol, **placeholder**, **empty**, or **malformed** quoting that still leaves a non-Postgres scheme (normalization fixes only BOM/wrapping quotes).
- **Why not Stripe (current failure):** Latest **`[fatal]`** after **`provider_config_validated`** is the **`DATABASE_URL`** PostgreSQL string check, not **`getValidatedStripeSecretKey()`**.
- **Why not mock provider:** **`assertProductionMoneyPathSafetyOrExit()`** runs **inside** **`logLaunchValidation()`** **before** the **`provider_config_validated`** lines; mock misconfig would surface earlier with **`production_safety_gate`** / **`mock_*_in_production`** style messaging.
- **Exact next operator action:** In Vercel **Production**, replace **`DATABASE_URL`** with a **full** **`postgresql://` or `postgres://`** connection string from Neon (or other Postgres), **save**, then **redeploy from `server/`** only.

---

## 11. Next Execution Plan

1. Replace **Vercel Production `DATABASE_URL`** with a **valid PostgreSQL URI** (`postgres://` or `postgresql://`).
2. Redeploy from: **`C:\Users\ahmad\zora_walat\server`** — **`vercel deploy --prod --yes`** (not monorepo root for this project).
3. Validate: **`curl.exe -i https://zora-walat-api-staging.vercel.app/api/index`** — expect **200**, **204**, or **405** (handler alive).
4. If API boots, send a **Stripe test** webhook to the **staging** URL (CLI or Dashboard) and confirm **2xx** + correct handling.
5. If webhook passes, run a **small checkout / payment** smoke in **test mode** only.
6. **Freeze** new feature work until **staging API** is **stable** (boot + **`/ready`** + webhook).

---

## 12. Cursor Agent Prompts For Next Phase

**A. Fix `DATABASE_URL` and validate boot**  
“You are in `C:\Users\ahmad\zora_walat`. Do not print secrets. Confirm Vercel Production **`DATABASE_URL`** is a **`postgres://` or `postgresql://`** URI. Deploy **only** from **`server/`**. Run **`curl.exe -i`** on **`/api/index`** and **`/ready`**. Parse **`fatal_startup_gate`** if still failing.”

**B. Validate Stripe webhook (test event)**  
“Trigger a **signed** Stripe **test** webhook to **`zora-walat-api-staging.vercel.app`** webhook path per **`server/api/index.mjs`**. Do not use live mode. Assert **2xx** and no **`FUNCTION_INVOCATION_FAILED`**. Never paste **`whsec_`** into chat.”

**C. Verify payment / checkout flow**  
“After API boot + webhook smoke, exercise **test-mode** checkout or Payment Element flow against staging API. Stop on first **non-2xx** or contract mismatch; capture **HTTP status and error codes only**.”

**D. Security and secrets audit**  
“Audit repo for **`.env`**, **keys**, **tokens** in tracked files; confirm **`.vercelignore`** / **`.gitignore`**; list **rotation** recommendations **without** reading secret values from Vercel.”

**E. Production readiness checklist**  
“Produce a **PASS/FAIL** matrix for **`zora-walat-api-staging`**: **`DATABASE_URL`**, **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, **`JWT_*`**, **`CORS_ORIGINS`**, **`CLIENT_URL`**, **`NODE_ENV`**, **`AIRTIME_PROVIDER`**, **`WEBTOPUP_FULFILLMENT_PROVIDER`**, **`ALLOW_MOCK_*`**, **`/health`**, **`/ready`**, **`/api/index`**. Names only.”

---

## 13. Definition Of Done

- No **`FUNCTION_INVOCATION_FAILED`** on **`/api/index`** for cold starts.
- API **boots** (no **`[fatal]`** from **`validateDatabaseConfigOrExit`** for **`DATABASE_URL`**).
- **`fatal_startup_gate`** shows **`passesPostgresSchemeCheck: true`** or gate not emitted for DB URI.
- **`STRIPE_SECRET_KEY`** / **`STRIPE_WEBHOOK_SECRET`** present and **test-mode aligned** for staging.
- Webhook route **accepts signed Stripe test event** (**2xx**).
- **No** **`.env`** uploaded with server bundle.
- **No secrets** in **git** history going forward.
- **Deploy path documented:** **`server/`** + **`vercel deploy --prod`**.
- **Rollback documented:** **`vercel promote <last-known-good-dpl_url>`** after **`vercel inspect`**.

---

## 14. CTO Recommendation

- **Continue staging stabilization** before shipping new product features.
- **Fix `DATABASE_URL` first** — it is the **only** confirmed **terminal** startup gate in the latest evidence chain.
- **Rotate** any secret class that may have been in a **bundled `.env`** or exposed in **logs**.
- **Keep Stripe test mode** on **`zora-walat-api-staging`** unless there is explicit business approval for live keys on that host.
- **Treat mock providers as explicitly gated** (**`ALLOW_MOCK_*`**) and prefer **Reloadly sandbox** for realistic staging.
- **Do not proceed to payment QA** until **`/api/index`**, **`/ready`**, and **webhook** are **reliably green** on staging.

---

*Documentation / audit only. No deploy, push, migration, or customer data access performed for this update.*
