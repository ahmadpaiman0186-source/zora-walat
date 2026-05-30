# L-10 — Staging API Surface Correction / Redeploy From Server Only Evidence

**Date:** 2026-05-30  
**L-step:** **L-10** — Staging API Surface Correction / Redeploy  
**Branch:** `evidence/l10-staging-api-surface-correction-redeploy-2026-05-30`  
**Base:** PR #124 (L-9 redeploy approval gate) merged  

---

## 1. Authorization — CORE10-L10-AUTH-001

| Field | Value |
|-------|-------|
| Required phrase (verbatim) | `APPROVE L-10 STAGING API SURFACE CORRECTION REDEPLOY FROM SERVER ONLY` |
| Provided in operator chat? | **YES** |
| **CORE10-L10-AUTH-001** | **PASS** |
| Scope | **Exactly one** staging API redeploy from `server/` + read-only post-deploy checks — **not** full snapshot, token refresh, env edit |

---

## 2. Session metadata

| Field | Value |
|-------|-------|
| UTC redeploy start | `2026-05-30T20:02:21.665Z` |
| Operator | Chat authorization (A.p.com); execution via Cursor agent |
| Witness | Redacted transcript filed |
| Redeploy count | **1** (attested) |

Transcript: [l10_redeploy_transcript_redacted.txt](./evidence/core10-l10-api-redeploy-2026-05-30/l10_redeploy_transcript_redacted.txt)

---

## 3. Predeploy — CORE10-L10-PREDEPLOY-GUARD-001

| Check | Result |
|-------|--------|
| Working directory | `server/` (API package `zora-walat-api`) |
| `npm run deploy:staging:guard` | **PASS** — `DEPLOY_GUARD_PASS` |
| `vercel.json` routes to `api/index.mjs` | **YES** |
| Monorepo root deploy | **NO** (guard blocks) |
| Env / config edit before deploy | **NO** |
| DB migrate command | **NO** |
| Stripe / Reloadly / webhook execution | **NO** |

**CORE10-L10-PREDEPLOY-GUARD-001:** **PASS**

---

## 4. Vercel / project target — CORE10-L10-VERCEL-TARGET-001

| Field | Value |
|-------|-------|
| Local linked project (read from `.vercel/project.json`) | `zora-walat-api-staging` |
| Deploy scope | `ahmadpaiman0186-sources-projects/zora-walat-api-staging` |
| Staging API project (not frontend app) | **CONFIRMED** by project name |
| Production **live-money** deploy | **NO** — staging API Vercel project only |
| Vercel settings UI edited | **NO** |
| Vercel env vars edited | **NO** |

**Note:** Vercel CLI labels staging project deploy target as `Production` (project production alias) — **not** zora-walat live-money production.

**CORE10-L10-VERCEL-TARGET-001:** **PASS**

---

## 5. Redeploy — CORE10-L10-REDEPLOY-001

| Field | Value |
|-------|-------|
| Command | `npm run deploy:staging` (= guard + `vercel deploy --prod --yes`) |
| Executed from | `server/` only |
| Redeploy count | **1** |
| Exit code | **0** |
| Ready state | **READY** |
| Alias (staging API) | `https://zora-walat-api-staging.vercel.app` |
| Deployment id | `dpl_BqvndARx6oY3XKNLW3ernxuRX9Gy` (for rollback reference) |

**CORE10-L10-REDEPLOY-001:** **PASS** — exactly one redeploy executed

---

## 6. Post-deploy health — CORE10-L10-HEALTH-001

| Field | Value |
|-------|-------|
| Request | `GET /api/health` on staging API alias |
| HTTP status | **200** |
| Content-Type | `application/json` |
| Response class | **api_json** |
| Body status field | `ok` (no full body pasted) |

**Before L-10 (L-8):** HTTP **404** HTML (`nextjs_frontend`).  
**After L-10:** API JSON — surface correction **observed**.

**CORE10-L10-HEALTH-001:** **PASS**

---

## 7. Post-deploy smoke — CORE10-L10-SMOKE-001

| Field | Value |
|-------|-------|
| Command | `node tools/staging-auth-checkout-operator.mjs staging-api-smoke` |
| `STAGING_API_SMOKE_VERDICT` | **PASS** |
| `API_SURFACE_LIKELY` | **api_serverless** |
| health probe | HTTP **200**, `ROUTE_DIAGNOSIS=ok` |
| index probe | HTTP **200** |
| login_route | HTTP **400** `validation_error` (expected empty body probe) |
| operator routes | HTTP **401** `auth_required` (no token — read-only probe) |

**Before L-10 (L-8):** **FAIL** `route_missing_or_wrong_deployment` / `nextjs_frontend`.  
**After L-10:** **PASS**.

**CORE10-L10-SMOKE-001:** **PASS**

---

## 8. Redaction status

| Rule | Status |
|------|--------|
| Secrets in committed transcript | **NONE** |
| Env values in evidence | **NONE** |
| Deployment URLs | Public staging alias only (documented) |

---

## 9. No mutation attestations — CORE10-L10-NO-MUTATION-001

| Domain | Mutated by L-10? |
|--------|------------------|
| Vercel settings / env (dashboard) | **NO** |
| Repo `.env*` files | **NO** |
| DB (migrate/write) | **NO** |
| Payment / wallet / order | **NO** |
| Provider / Stripe / Reloadly | **NO** |
| Webhook replay | **NO** |
| Token refresh | **NO** (out of scope) |
| Full snapshot export | **NO** (out of scope) |

**CORE10-L10-NO-MUTATION-001:** **PASS**

---

## 10. Rollback / abort — CORE10-L10-ROLLBACK-001

| Scenario | Action |
|----------|--------|
| Bad deploy | Vercel: promote prior deployment via dashboard/CLI `vercel rollback` / redeploy previous known-good — operator-run |
| Abort mid-deploy | `Ctrl+C`; inspect partial deployment in Vercel inspector URL (redacted in transcript) |
| L-10 evidence revert | `git revert` L-10 PR — docs only |
| Secret in deploy log | Stop filing; rotate credentials per security process |

**CORE10-L10-ROLLBACK-001:** **FILED** (path documented; not executed)

---

## 11. Blockers remaining

| ID | Status | Note |
|----|--------|------|
| **CORE10-L8-BLK-002** (API surface) | **CLOSED** for hosted `/api/health` JSON | L-10 redeploy |
| **CORE10-BLK-CAPTURE-001** | **OPEN** | Full read-only snapshot **not** executed in L-10 |
| **CORE10-L8-BLK-001** (token) | **OPEN** | Operator login still required for status-check |
| Runtime Doctor staging proof | **NOT VERIFIED** | Needs non-empty snapshot |
| Observability proof | **NOT VERIFIED** | Needs correlated capture |

---

## 12. Risk register (L-10 session)

| ID | Risk | Outcome |
|----|------|---------|
| L10-R-01 | Wrong project deploy | **Mitigated** — `zora-walat-api-staging` |
| L10-R-02 | Production live deploy | **Avoided** |
| L10-R-03 | Env leak in logs | **Avoided** — redaction |
| L10-R-04 | False launch claim | **Avoided** — conservative verdict |

---

## 13. Evidence ID summary — CORE10-L10-VERDICT-001

| ID | Status |
|----|--------|
| CORE10-L10-AUTH-001 | **PASS** |
| CORE10-L10-PREDEPLOY-GUARD-001 | **PASS** |
| CORE10-L10-VERCEL-TARGET-001 | **PASS** |
| CORE10-L10-REDEPLOY-001 | **PASS** (count=1) |
| CORE10-L10-HEALTH-001 | **PASS** |
| CORE10-L10-SMOKE-001 | **PASS** |
| CORE10-L10-NO-MUTATION-001 | **PASS** |
| CORE10-L10-ROLLBACK-001 | **FILED** |

---

## 14. Final conservative verdict

| Item | Verdict |
|------|---------|
| L-10 staging API surface correction / redeploy | **EXECUTED** |
| Redeploy count | **1** |
| Production/live-money deploy | **NO** |
| Env/config mutation | **NO** |
| DB/payment/provider mutation | **NO** |
| Hosted API JSON health | **PASS** (post-deploy) |
| Full snapshot export | **NOT EXECUTED** |
| Token refresh | **NOT EXECUTED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / pilot / market | **NO-GO** |

**Canonical sentence:**

> L-10 staging API surface correction/redeploy **EXECUTED** (redeploy count **1**); post-deploy `/api/health` **API JSON 200** and `staging-api-smoke` **PASS**; full snapshot **NOT EXECUTED**; Runtime Doctor / observability staging proof **NOT VERIFIED**; production / real-money / controlled pilot / market launch **NO-GO**.

---

## 15. Related documents

| Document | Role |
|----------|------|
| [L-9 gate](./ZORA_WALAT_L9_CORE10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_APPROVAL_GATE_2026_05_30.md) | PR #124 |
| [L-8 verify](./ZORA_WALAT_L8_CORE10_TOKEN_REFRESH_API_BASE_VERIFY_EVIDENCE_2026_05_30.md) | Pre-fix smoke FAIL |

---

*End of L-10 evidence.*
