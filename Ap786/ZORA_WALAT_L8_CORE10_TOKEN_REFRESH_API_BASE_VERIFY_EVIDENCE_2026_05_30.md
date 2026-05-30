# L-8 — Read-Only Staging Operator Token Refresh + API Base URL Verification Evidence

**Date:** 2026-05-30  
**L-step:** **L-8** — Token Refresh + API Base URL Verification (narrow scope)  
**Branch:** `evidence/l8-core10-token-refresh-api-base-verify-2026-05-30`  
**Base:** PR #122 (L-7) merged · PR #121 (L-6) partial capture  

---

## 1. Authorization — CORE10-L8-AUTH-001

| Field | Value |
|-------|-------|
| Required phrase (verbatim) | `APPROVE L-8 READ-ONLY STAGING OPERATOR TOKEN REFRESH AND API BASE URL VERIFY ONLY` |
| Provided in operator chat? | **YES** |
| **CORE10-L8-AUTH-001** | **PASS** |
| Scope | Token refresh attempt + API base read-only verify + status-check only — **not** full snapshot export |

---

## 2. Session metadata

| Field | Value |
|-------|-------|
| UTC start | `2026-05-30T19:20:21.505Z` |
| Operator | Chat authorization (A.p.com); execution via Cursor agent |
| Witness | Redacted transcript filed |
| Read-only scope | Operator `login` attempt · `deploy:staging:guard` · `staging-api-smoke` · `status-check` |

Transcript: [l8_capture_transcript_redacted.txt](./evidence/core10-l8-token-api-verify-2026-05-30/l8_capture_transcript_redacted.txt)

---

## 3. Commands / actions performed

| # | Command / action | Mutation? |
|---|------------------|-----------|
| 1 | `Test-Path .staging-token.local` (presence only) | **NO** |
| 2 | `node tools/staging-auth-checkout-operator.mjs login` | **NO** (skipped — no env creds) |
| 3 | `npm run deploy:staging:guard` | **NO** (local filesystem guard) |
| 4 | `node tools/staging-auth-checkout-operator.mjs staging-api-smoke` | **NO** (read-only HTTP probes) |
| 5 | `node tools/staging-auth-checkout-operator.mjs status-check` | **NO** (read-only GET; blocked expired token) |

**Not performed:** full snapshot export, deploy, env edit, Stripe, Reloadly, DB write, `checkout`, webhook replay.

---

## 4. Token refresh — CORE10-L8-TOKEN-REFRESH-001

| Field | Value |
|-------|-------|
| Token file policy | `server/.staging-token.local` — **gitignored** |
| File existed before session | **YES** |
| Login executed | **ATTEMPTED** |
| Login result | **LOGIN_SKIPPED** — `STAGING_OPERATOR_EMAIL` / `STAGING_OPERATOR_PASSWORD` **not** set in non-interactive shell |
| Token refreshed | **NO** |
| Token expiry (enum from status-check) | `2026-05-19T19:45:18.000Z` — **expired** |
| **CORE10-L8-TOKEN-REFRESH-001** | **FAIL** (refresh not completed) |

---

## 5. No-token-print — CORE10-L8-TOKEN-NO-PRINT-001

| Check | Status |
|-------|--------|
| Token printed to terminal in saved transcript | **NO** |
| Token pasted into Ap786 markdown | **NO** |
| Token committed to git | **NO** |
| Token file content read for evidence | **NO** (presence via `Test-Path` only) |
| JWT / Bearer lines in transcript | **REDACTED** if appeared |

**CORE10-L8-TOKEN-NO-PRINT-001:** **PASS**

---

## 6. API base URL verification — CORE10-L8-API-BASE-001

| Field | Value |
|-------|-------|
| Configured origin (tool constant) | `REDACTED_STAGING_API_HOST` (staging API hostname — not secret; redacted in transcript) |
| Local deploy guard | **PASS** — `DEPLOY_GUARD_PASS` — `server/` has API `vercel.json` routes |
| Live read-only probes | `staging-api-smoke` |
| `GET /api/health` | HTTP **404** — `route_missing_or_wrong_deployment` |
| API surface classification | **nextjs_frontend** (HTML 404 — not API JSON) |
| **STAGING_API_SMOKE_VERDICT** | **FAIL** |
| Correct API base on hosted URL | **NOT VERIFIED** — wrong deployment surface |

**Interpretation:** Local repo is configured as API project, but **hosted** `REDACTED_STAGING_API_HOST` currently serves Next.js-style 404, matching L-6 finding. **Deploy to correct API project required** (out of L-8 scope — not authorized).

**CORE10-L8-API-BASE-001:** **EXECUTED** · result **FAIL** (hosted API not reachable)

---

## 7. Read-only status-check — CORE10-L8-STATUS-CHECK-001

| Field | Value |
|-------|-------|
| Executed | **YES** |
| HTTP / order enums | **Blocked** — `TOKEN_EXPIRED`, `ORDER_STATE_UNAVAILABLE`, `ORDER_AUTH_FAILURE` |
| Order ID in docs | **NOT** filed (redacted policy) |
| **CORE10-L8-STATUS-CHECK-001** | **BLOCKED** |

---

## 8. External systems (read-only)

| System | Access | Result |
|--------|--------|--------|
| Staging HTTPS (configured API host) | GET probes via `staging-api-smoke` | **404** HTML frontend surface |
| Staging operator API (authenticated) | status-check **attempted** | **Blocked** — expired token |
| Stripe / Reloadly / DB / Vercel dashboard | **NONE** | — |

---

## 9. Redaction status

| Rule | Status |
|------|--------|
| Secrets in committed artifacts | **NONE** |
| Host in transcript | Label `REDACTED_STAGING_API_HOST` |
| Order IDs in Ap786 | **Not** copied |

---

## 10. No-mutation — CORE10-L8-NO-MUTATION-001

| Domain | Mutated? |
|--------|----------|
| DB | **NO** |
| Payment / wallet / order | **NO** |
| Provider / Stripe / Reloadly | **NO** |
| Deploy / env / Vercel settings | **NO** |
| Auto-repair apply | **NO** |

**CORE10-L8-NO-MUTATION-001:** **PASS**

---

## 11. Blockers remaining

| ID | Status | Note |
|----|--------|------|
| **CORE10-BLK-CAPTURE-001** | **OPEN** | Full read-only snapshot **not** executed in L-8 |
| **CORE10-L8-BLK-001** | **OPEN** | Token refresh incomplete — operator env creds required for `login` |
| **CORE10-L8-BLK-002** | **OPEN** | Hosted staging URL = wrong deployment (API smoke **FAIL**) |

---

## 12. Risk register (L-8 session)

| ID | Risk | Outcome |
|----|------|---------|
| L8-R-01 | Token exposure | **Avoided** — no-print PASS |
| L8-R-02 | Wrong API base | **Confirmed** — smoke FAIL |
| L8-R-03 | False staging proof | **Avoided** — not claimed |
| L8-R-04 | Accidental deploy | **Avoided** — guard only, no deploy |

---

## 13. Evidence ID summary — CORE10-L8-VERDICT-001

| ID | Status |
|----|--------|
| CORE10-L8-AUTH-001 | **PASS** |
| CORE10-L8-TOKEN-REFRESH-001 | **FAIL** |
| CORE10-L8-TOKEN-NO-PRINT-001 | **PASS** |
| CORE10-L8-API-BASE-001 | **FAIL** (hosted API) |
| CORE10-L8-STATUS-CHECK-001 | **BLOCKED** |
| CORE10-L8-NO-MUTATION-001 | **PASS** |

---

## 14. Final conservative verdict

| Item | Verdict |
|------|---------|
| L-8 session | **EXECUTED** (evidence filed) |
| Token refresh | **NOT COMPLETED** |
| Token printed/read into docs | **NO** |
| API base verify (hosted) | **FAIL** — frontend 404 on API paths |
| Full snapshot export | **NOT EXECUTED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / pilot / market | **NO-GO** |

**Canonical sentence:**

> L-8 token refresh / API base verification **EXECUTED** with evidence filed; token refresh **NOT COMPLETED**; hosted API base **NOT VERIFIED** (smoke **FAIL**); status-check **BLOCKED**; full snapshot **NOT EXECUTED**; Runtime Doctor / observability staging proof **NOT VERIFIED**; production / real-money / pilot / market launch **NO-GO**.

---

## 15. Rollback

No runtime rollback. Token file unchanged in git. Revert L-8 PR = docs only.

**Next (operator, out of L-8 scope):** Set `STAGING_OPERATOR_EMAIL` / `STAGING_OPERATOR_PASSWORD` locally (gitignored), run `login`, then **separately approved** API redeploy from `server/` if program authorizes deploy — then L-9 full read-only snapshot if separately authorized.

---

*End of L-8 evidence.*
