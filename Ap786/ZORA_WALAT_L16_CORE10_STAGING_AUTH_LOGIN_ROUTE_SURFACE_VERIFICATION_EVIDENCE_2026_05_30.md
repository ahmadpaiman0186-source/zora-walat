# L-16 — CORE-10 Staging Auth Login Route Surface Verification Evidence

**Date:** 2026-05-30  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-16** — Read-only staging auth login route surface verification  
**Branch:** `evidence/l16-core10-staging-auth-login-route-surface-verification-2026-05-30`  
**Base:** `9f3503d` — Merge PR #130 (L-15 investigation gate)  
**Transcript:** [l16_route_surface_transcript_redacted.txt](./evidence/core10-l16-auth-route-surface-verification-2026-05-30/l16_route_surface_transcript_redacted.txt)

---

## 1. Authorization — CORE10-L16-AUTH-001

| Field | Value |
|-------|-------|
| Required phrase (verbatim) | `APPROVE L-16 READ-ONLY STAGING AUTH LOGIN ROUTE SURFACE VERIFICATION ONLY` |
| Provided in operator task? | **YES** |
| **CORE10-L16-AUTH-001** | **PASS** |

### Scope honored

| Allowed | Executed? |
|---------|-----------|
| `deploy:staging:guard` (read-only) | **YES** |
| `staging-api-smoke` | **YES** |
| Redacted Ap786 evidence | **YES** |

| Forbidden | Status |
|-----------|--------|
| Deploy / redeploy | **NO** |
| `login` / token refresh | **NO** |
| `status-check` | **NO** |
| Full snapshot | **NOT EXECUTED** |
| Env / Vercel / secrets edit | **NO** |
| DB / payment / provider / Stripe / Reloadly | **NO** |

---

## 2. Local deploy guard — CORE10-L16-GUARD-001

| Field | Value |
|-------|-------|
| Command | `npm run deploy:staging:guard` (from `server/`) |
| `DEPLOY_GUARD_PASS` | **true** |
| `DEPLOY_GUARD_ROOT` | `server_api_project` |
| Deploy executed | **NO** |

**CORE10-L16-GUARD-001:** **PASS** (local repo layout correct for API deploy)

---

## 3. Hosted surface smoke — CORE10-L16-SMOKE-001

| Probe | HTTP | `ROUTE_DIAGNOSIS` | `API_SURFACE_LIKELY` |
|-------|------|-------------------|----------------------|
| `health` | **404** | `route_missing_or_wrong_deployment` | `nextjs_frontend` |
| `index` | **404** | `route_missing_or_wrong_deployment` | `nextjs_frontend` |
| `login_route` (`POST /api/auth/login` empty body) | **404** | `route_missing_or_wrong_deployment` | `nextjs_frontend` |
| `operator_status_route` | **404** | `route_missing_or_wrong_deployment` | `nextjs_frontend` |
| `operator_phase1_truth_route` | **404** | `route_missing_or_wrong_deployment` | `nextjs_frontend` |

| Field | Value |
|-------|-------|
| `STAGING_API_SMOKE_VERDICT` | **FAIL** |
| `BLOCKED_REASON` | `route_missing_or_wrong_deployment` |
| `DEPLOY_REQUIRED` (tool hint) | **true** — **not** acted on in L-16 |

**Contrast L-10 (post-redeploy):** health **200 JSON**; smoke **PASS**; `login_route` **400** (route reachable).  
**L-16 (now):** all probes **404** / `nextjs_frontend` — hosted API surface **regressed or mis-aliased**.

**CORE10-L16-SMOKE-001:** **FAIL**

---

## 4. Abort rules applied

| Rule | Triggered? |
|------|------------|
| Smoke 404 / `nextjs_frontend` → stop | **YES** |
| No credential `login` | **YES** |
| No deploy despite tool hint | **YES** |
| Secrets in filed transcript | **NO** |

---

## 5. L-14 / L-15 reconciliation

| Step | Finding |
|------|---------|
| L-14 login **404** | **Consistent** with L-16 smoke — hosted surface not API |
| L-15 hypotheses H1/H2 | **Supported** — wrong deployment / regression |
| Credential gap | **Closed** — failure is **route surface**, not password |

---

## 6. No-mutation attestation

| Domain | Mutated? |
|--------|----------|
| Deploy / Vercel | **NO** |
| Env / secrets in git | **NO** |
| DB / payment / orders | **NO** |
| Token / password exposure | **NO** |

---

## 7. Evidence artifact summary

| ID | Result |
|----|--------|
| CORE10-L16-AUTH-001 | **PASS** |
| CORE10-L16-GUARD-001 | **PASS** |
| CORE10-L16-SMOKE-001 | **FAIL** |
| CORE10-L16-VERDICT-001 | **FAILED** |

---

## 8. Final conservative verdict — CORE10-L16-VERDICT-001

| Item | Verdict |
|------|---------|
| L-16 surface verification | **FAILED** |
| Login route reachable on hosted alias | **NO** |
| Root cause resolved | **NO** |
| Token refresh | **NOT COMPLETED** |
| Full snapshot | **NOT EXECUTED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |

**Canonical sentence:**

> L-16 authorized read-only verification: local deploy guard **PASS**; hosted `staging-api-smoke` **FAIL** (all probes **404** / `nextjs_frontend`). Login route **not** verified reachable. No deploy, login, status-check, or snapshot. Production / real-money / controlled pilot / market launch: **NO-GO**.

**CORE10-L16-VERDICT-001:** **FAILED**

---

## 9. Next gated step (separate authorization only)

| Option | Requires |
|--------|----------|
| Staging API surface correction redeploy | Phrase class **L-10** (`APPROVE L-10 STAGING API SURFACE CORRECTION REDEPLOY FROM SERVER ONLY`) — **not** executed in L-16 |
| Token refresh retry after surface PASS | **L-14** class phrase after smoke **PASS** |
| Full snapshot | Separate CORE-10 capture authorization |

**Do not** run credential `login` until `staging-api-smoke` **PASS** and `login_route` probe is not **404**.

---

## 10. Related documents

| Document | Role |
|----------|------|
| [L-15 gate](./ZORA_WALAT_L15_CORE10_STAGING_AUTH_LOGIN_ROUTE_SURFACE_INVESTIGATION_GATE_2026_05_30.md) | Investigation plan |
| [L-14 evidence](./ZORA_WALAT_L14_CORE10_STAGING_OPERATOR_CREDENTIAL_TOKEN_REFRESH_EVIDENCE_2026_05_30.md) | Login 404 |
| [L-10 redeploy](./ZORA_WALAT_L10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md) | Prior PASS baseline |

---

*End of L-16 evidence.*
