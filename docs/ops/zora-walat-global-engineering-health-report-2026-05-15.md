# Zora-Walat Global Engineering Health Report — March 28 to May 15, 2026

## 1. Executive Summary

- **Current state:** Staging API project **`zora-walat-api-staging`** deploys from **`server/`** with **`server/vercel.json`** routing all traffic to **`api/index.mjs`**. Prior incidents (wrong-root Next deploy, bundled **`.env`**, invalid **`DATABASE_URL`** scheme, checkout quote before validation) were addressed in git through mid-May 2026. A follow-on symptom was **`curl --max-time 20`** to **`https://zora-walat-api-staging.vercel.app/api/index`** returning **no bytes** within 20s — consistent with **cold-start blocking** on **`bootstrap.js`** (optional Redis) and/or **full Express import** before any response.
- **What works:** Slim paths for **`GET /health`**, **`GET /ready`** (bounded DB probe), and **Stripe webhook** signature gate before full bootstrap; **`.vercelignore`** excluding env files; **Prisma** lazy client (no **`$connect`** at import); **fatal_startup_gate** JSON for production **`DATABASE_URL`** shape.
- **What was broken:** **`GET /api/index`** had **no fast path** and always waited for **`getHandler()`** → **`bootstrap`** (top-level **`await`** on rate-limit Redis) → **dynamic import** of the full app graph — vulnerable to **long or stuck TCP** to Redis and/or **large cold-start** cost, surfacing as **client-side timeouts**.
- **What was fixed today (code):** (1) **Slim `GET`/`HEAD` `/api/index`** (and **`/index`**) returning **`200`** JSON without bootstrap/Express. (2) **Slim `GET /api/health`** and **`GET /api/ready`** at the serverless entry (same as root **`/health`** / **`/ready`**), because **`vercel.json`** routes **`/api/*`** into **`api/index.mjs`** and **`req.url`** carries the **`/api/...`** prefix. (3) **Hard wall (3–5s)** around **`redis`** **`connect()`** in **`rateLimitRedisInit.js`**. (4) **Sanitized `[startup] phase=...`** logs in **`bootstrap.js`** and **`api/index.mjs`** **`getHandler()`** cold path.
- **Current blocker (live verification):** None for **`/api/index`**, **`/api/health`**, and **`/api/ready`** on **`https://zora-walat-api-staging.vercel.app`** as of deployment **`dpl_64QfLaCRTmnZbkXETeVt8ZA2AXaE`** (**`curl --max-time 20`** verified). Re-check after any env or routing change.
- **CTO recommendation:** **Freeze feature work** until staging **`/api/index`**, **`/ready`**, and webhook smoke are green. **Deploy only from `server/`**. **Keep Stripe test mode** on staging. **Rotate** any secret class that may have been bundled in historical **`.env`** artifacts. Use **`/ready`** for bounded DB truth; use **`/api/index`** only as a **liveness** probe (now deterministic). **Mock providers** only with explicit **`ALLOW_MOCK_*_IN_PRODUCTION`** flags.

---

## 2. Architecture Inventory

| Area | Notes |
|------|--------|
| **Monorepo** | Root **Next.js** (`app/`, marketing); **`server/`** Node 20+ **Express** API; **`lib/`** Flutter. |
| **Root app** | **`npm run dev` / `build`** — separate from API Vercel project. |
| **`server/`** | **`start.js`** local listen; **`api/index.mjs`** Vercel serverless entry; **`bootstrap.js`** dotenv + optional Redis init; **`src/app.js`** **`createApp()`**; **`src/runtime/serverLifecycle.js`** **`createValidatedApp()`** + gates. |
| **Flutter/mobile** | Not modified in this recovery slice. |
| **Vercel API** | **`vercel.json`**: **`/(.*)` → `/api/index.mjs`**; handler must **not** call **`listen()`** on the serverless path. |
| **Stripe** | **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**; slim webhook path verifies signature before bootstrap. |
| **Webhook** | Express **`/webhooks/stripe`** + slim **`POST /webhooks/stripe`** in **`api/index.mjs`**. |
| **DB/Prisma/Neon** | **`DATABASE_URL`** pooled **`postgresql://`**; **`src/db.js`** normalizes URL; Prisma connects **lazily** on first query. |
| **Provider system** | Reloadly-oriented airtime/webtopup; mock defaults require explicit production allow flags. |
| **Env model** | **`server/src/config/env.js`** central parse; production gates in **`validateServerRuntimeOrExit`**. |
| **Startup gates** | JWT length, **`DATABASE_URL`** Postgres scheme in production, Stripe keys, CORS, TTLs, deployment contracts — **`process.exit(1)`** on hard failure (fast fail, not hang). |

---

## 3. Timeline From March 28 to May 15

- **Mar 28 – Apr:** Vercel packaging (Next/Flutter), API URL realignment, money-path and CI stabilization (see recovery report).
- **May 6–9:** Readiness bounds, **`.vercelignore`** for API env files.
- **May 11–12:** Slim **`/ready`**, slim Stripe webhook before bootstrap.
- **May 13–15:** Next build fixes (root); checkout quote validate-before-Redis; **`DATABASE_URL`** normalization + **`fatal_startup_gate`**; **`.vercelignore`**; ops recovery markdown.
- **May 15 (this slice):** **`/api/index`** slim probe + Redis connect wall + startup phase logging + this health report.

---

## 4. Critical Incident Register

| Incident | Symptom | Root cause | Fix | Remaining risk |
|----------|---------|------------|-----|----------------|
| Wrong root deploy | API domain served Next HTML | **`vercel deploy`** from monorepo root | Promote **`λ api/index`** deployment; document **`server/`** cwd | Wrong cwd repeat |
| **`.env`** in Lambda | Shadowed Vercel env / secrets in logs | **`.env`** not ignored | **`server/.vercelignore`** | Old deployment artifacts |
| Stripe secret missing/invalid | 500 / exit | Env unset or wrong | Reset in Vercel dashboard | Live vs test key misuse |
| Webhook secret | Signature failures | **`whsec_`** mismatch or placeholder | Align **`STRIPE_WEBHOOK_SECRET`** with Stripe CLI / Dashboard | Session rotation drift |
| Invalid **`DATABASE_URL`** | **`FUNCTION_INVOCATION_FAILED`** | Non-Postgres scheme or malformed URI | Normalization + fatal JSON gate | Neon pool vs direct URL misuse |
| **`/api/index` 20s timeout** | 0 bytes to client | Cold path always loaded **bootstrap + Express**; Redis **`connect()`** could run unbounded in edge cases | Slim **`GET/HEAD /api/index`**; **`Promise.race`** wall on Redis connect | Other routes still pay full cold cost once per instance |

---

## 5. Code Health

| File / area | Status | Risk | Action taken | Remaining work |
|-------------|--------|------|--------------|----------------|
| **`server/api/index.mjs`** | Improved | Cold paths for other URLs | Slim **`/api/index`**, phase logs, **`finish`** log for non-GET **`/api/index`** | Optional: **`/api/ready`** alias to slim ready |
| **`server/bootstrap.js`** | Improved | Verbose **`[env]`** logs in non-test | Phase logs; DB/prisma explicitly skipped at bootstrap | Reduce duplicate **`phase=entry_start`** if local + serverless double-import noisy |
| **`server/src/lib/rateLimitRedisInit.js`** | Improved | Redis client bug ignoring socket timeout | **3–5s** wall around **`connect()`** | Monitor **`memory_fallback`** rate |
| **`server/src/runtime/serverLifecycle.js`** | Stable | **`process.exit`** in production misconfig | Prior fixes for **`DATABASE_URL`** | None in this slice |
| **`docs/ops/*`** | Updated | Staleness | This report + prior recovery doc | Operator to refresh deployment URLs after each prod deploy |

---

## 6. Server/API Health

- **Boot path:** **`registerServerlessRuntime`** → **`handler`** → fast branches (**`/health`**, **`/ready`**, **`/api/index`**, slim webhook) or **`getHandler()`** → **`bootstrap`** → **`import(src/index.js)`** + **`serverless-http`** → **`createValidatedApp()`** → cached handler.
- **Handler path:** **`export default function handler(req,res)`** — correct Vercel shape.
- **Route registration:** Occurs inside **`createValidatedApp`** → **`createApp()`**; not on slim **`/api/index`** path.
- **DB dependency:** Not required for **`GET/HEAD /api/index`** probe; required for business routes and **`/ready`** probe.
- **Timeout behavior:** Redis rate-limit init bounded to **≤5s** wall; slim **`/ready`** already **5s** outer budget.
- **Error behavior:** Production misconfig still **`process.exit(1)`** (fail loud, not silent hang for those cases).

---

## 7. Database Health

- **`DATABASE_URL`:** Must be **`postgres://`** or **`postgresql://`** for production gate; BOM/quotes stripped in code.
- **Pooled vs direct:** Neon pooled URLs are expected for serverless; use Prisma + Neon guidance for transaction limits if using interactive transactions.
- **Prisma:** Lazy TCP; no import-time **`$connect`** in **`src/db.js`**.
- **Migrations:** Not run in this operation (per policy).

---

## 8. Stripe/Payment Health

- **Secrets:** Set only in Vercel / secure stores — never logged in this report.
- **Test/live:** Staging should use **test** keys unless explicitly approved.
- **Webhooks:** Slim path avoids loading full app for invalid signatures.

---

## 9. Vercel/Deployment Health

- **Correct deploy path:** **`cd C:\Users\ahmad\zora_walat\server`** then **`vercel deploy --prod --yes`**.
- **Alias:** **`https://zora-walat-api-staging.vercel.app`** (verify latest unique URL in Vercel dashboard after deploy).
- **`.vercelignore`:** Excludes **`.env*`** from serverless bundle.

---

## 10. Security Health

- No secret values logged in new **`[startup]`** lines.
- **`.env`** must not be committed; **`.vercelignore`** reduces upload risk.
- **Rotate** credentials if historical bundle exposure is suspected.

---

## 11. Production Readiness Matrix

| Area | Status | Severity | Required action | Owner | Verification |
|------|--------|----------|-----------------|-------|----------------|
| **`/api/index` liveness** | Fixed | High | Slim **`GET/HEAD`** in **`api/index.mjs`** | Eng | **`curl`** 200 < 20s |
| **`/api/health` / `/api/ready`** | Fixed | High | Match **`/api/...`** prefix at serverless entry (Vercel passes full path) | Eng | **`curl`** 200 < 20s |
| Full API cold start | Partial | Medium | Watch logs for **`phase=`** stalls | Eng | Spot-check heavy routes |
| DB connectivity | Env-dependent | High | **`/ready`** on staging | Ops | 200 or explicit 503 |
| Unit tests on dev laptop | Red without valid DB | Medium | CI or local test **`DATABASE_URL`** | Eng | **`npm run test`** green |

---

## 12. Risk Register

| Risk | Severity | Likelihood | Impact | Mitigation | Verification |
|------|----------|------------|--------|------------|--------------|
| Slim **`/api/index`** masks broken full stack | Medium | Low | False green if only this URL is probed | Also probe a trivial authenticated or **`/ready`** route | Runbook |
| Redis wall hides partial connect | Low | Low | Rare socket leak | **`quit()`** / **`disconnect()`** on failure path | Logs |
| **`npm run test`** without CI DB | Medium | High | Local red builds | Use integration DB or skip DB suites | CI pipeline |

---

## 13. Remaining Work Roadmap

1. **API boot stabilization:** Deploy this commit; confirm **`curl /api/index`**.
2. **Webhook smoke:** **`stripe listen`** + signed POST.
3. **Checkout/payment smoke:** Test-mode PaymentIntent / checkout quote.
4. **DB schema/migration review:** Scheduled change window (not done here).
5. **Production hardening:** CORS, rate limits, secret rotation cadence.
6. **Release readiness:** Green CI, load smoke, rollback drill.

---

## 14. Definition of Done

- [x] **`curl --max-time 20 -i https://zora-walat-api-staging.vercel.app/api/index`** → **200**, **204**, or **405** with bytes received (verified **200** + **`{"status":"ok"}`** after deploy **`dpl_64QfLaCRTmnZbkXETeVt8ZA2AXaE`**).
- [x] No silent **20s** hang on **`/api/index`** probe (same deployment as above).
- [ ] Bounded diagnostics present in logs (**`[startup] phase=`**).
- [ ] DB path stable (**`/ready`**).
- [ ] Stripe **test** mode on staging.
- [ ] No secrets in repo; deploy path documented.

---

## 15. Final CTO Recommendation

**Freeze feature work** until staging **`curl`** and **`/ready`** are green after deploy from **`server/`**. Treat **`/api/index`** as a **cheap liveness** endpoint only. **Do not** use monorepo root for API deploys. **Rotate** secrets if **`.env`** was ever bundled. Require **smoke tests** before payment QA.
