# L-24 — CORE-10 Read-Only Staging Auth Login HTTP 500 Diagnosis Evidence

**Date:** 2026-05-31  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-24** — Read-Only Staging Auth Login HTTP **500** Diagnosis  
**Branch:** `evidence/l24-core10-staging-auth-login-http500-diagnosis-2026-05-31`  
**Base:** `1e74679` — Merge PR #138 (L-23 diagnosis gate)  
**Gate:** [L-23](./ZORA_WALAT_L23_CORE10_STAGING_AUTH_LOGIN_HTTP500_DIAGNOSIS_GATE_2026_05_31.md)  
**Transcript:** [l24_auth_login_http500_diagnosis_transcript_redacted.txt](./evidence/core10-l24-auth-login-http500-diagnosis-2026-05-31/l24_auth_login_http500_diagnosis_transcript_redacted.txt)

---

## 1. Authorization — CORE10-L24-AUTH-001

| Field | Value |
|-------|-------|
| Required phrase (verbatim) | `APPROVE L-24 READ-ONLY STAGING AUTH LOGIN HTTP 500 DIAGNOSIS ONLY` |
| **AUTHORIZATION_RECEIVED** | **true** |

---

## 2. Required evidence matrix

| Field | Value |
|-------|-------|
| **DIAGNOSIS_MODE** | `read_only` |
| **API_HEALTH** | **FAIL** — `GET /api/health` HTTP **404** at L-24 session time |
| **API_SURFACE** | **FAIL** — `staging-api-smoke` exit **1**; `API_SURFACE_LIKELY=nextjs_frontend`; all probes **404** |
| **LOGIN_ROUTE_REACHABLE** | **false** (API route not served — wrong deployment surface) |
| **LOGIN_ROUTE_NOT_404** | **false** (`login_route` probe **404**) |
| **RUNTIME_LOGS_CAPTURED** | **false** — Vercel CLI returned no logs (48h / 7d / status **500** queries) |
| **RUNTIME_ERROR_CLASS** | `route_missing_or_wrong_deployment` (current); L-22 historical: `auth_slim_unhandled_internal` (inferred, see §5) |
| **ENV_NAME_PRESENCE_CHECKED** | **true** — `vercel env ls production` for `zora-walat-api-staging` |
| **ENV_VALUES_PRINTED** | **false** |
| **SECRET_VALUES_PRINTED** | **false** |
| **TOKEN_PRINTED** | **false** |
| **PASSWORD_PRINTED** | **false** |
| **LOGIN_ATTEMPT_EXECUTED** | **false** |
| **TOKEN_REFRESH_EXECUTED** | **false** |
| **SNAPSHOT_EXECUTED** | **false** |
| **DEPLOY_EXECUTED** | **false** |
| **DB_MUTATION** | **false** |
| **PAYMENT_MUTATION** | **false** |
| **PROVIDER_MUTATION** | **false** |
| **SELF_HEALING_APPLY** | **false** |
| **ROOT_CAUSE_CONFIDENCE** | **medium** (dual-track; see §5) |
| **ROOT_CAUSE_CONFIRMED** | **false** |
| **PROPOSED_NEXT_GATE** | **L-18-class staging API surface correction redeploy** (`APPROVE L-18 STAGING API SURFACE CORRECTION REDEPLOY FROM SERVER ONLY` or successor phrase), **then** L-22-class token refresh retry after smoke **PASS**, **then** L-21-class snapshot with fresh phrase |
| **PRODUCTION_READY** | **false** |
| **REAL_MONEY_READY** | **false** |

---

## 3. Verdict — CORE10-L24-VERDICT-001

| Item | Status |
|------|--------|
| **CORE10-L24-VERDICT-001** | **INCONCLUSIVE** for L-22 HTTP **500** root cause; **BLOCKING** API surface regression detected at diagnosis time |
| Runtime diagnosis | **EXECUTED** (read-only checks + source inspection; **no** login) |
| Token refresh | **NOT EXECUTED** |
| Full snapshot | **NOT EXECUTED** |
| Runtime Doctor / observability | **NOT VERIFIED** |
| **CORE10-BLK-CAPTURE-001** | **OPEN** |

**Conservative launch posture:** production · pilot · real-money · market — **NO-GO**.

---

## 4. Evidence chain (context)

| L-step | Outcome relevant to diagnosis |
|--------|------------------------------|
| **L-18** | API surface redeploy **PASS** |
| **L-19** | `login` HTTP **200**; token refresh **SUCCESS** |
| **L-21** | Snapshot **BLOCKED_TOKEN** (expired) |
| **L-22** | Smoke **PASS**; `login` HTTP **500** / `auth_invalid_request` |
| **L-23** | Diagnosis gate **FILED** |
| **L-24** | Smoke **FAIL** **404** / `nextjs_frontend` — surface **regressed** vs L-22 |

---

## 5. Hypothesis matrix — CORE10-L24-HYPOTHESIS-001

| ID | Hypothesis | L-24 disposition | Rationale |
|----|------------|------------------|-----------|
| **H1** | Invalid/missing server auth env | **RULED OUT** (dashboard) / **INCONCLUSIVE** (runtime) | Vercel production lists `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (**Encrypted**); values not inspected |
| **H2** | Operator credential mismatch | **RULED OUT** for L-22 **500** | Handler maps bad password to HTTP **401** (`AUTH_INVALID_CREDENTIALS`), not **500** |
| **H3** | Auth route dependency unavailable | **INCONCLUSIVE** | No runtime logs captured |
| **H4** | Database/session dependency issue | **LIKELY** for L-22 **500** when API surface was OK | `loginUser` uses Prisma + `refreshToken.create`; unhandled DB errors map to **500** `Service unavailable` |
| **H5** | Staging deployment env drift / wrong deploy | **CONFIRMED** at L-24 time | Smoke **404** + `nextjs_frontend` — same class as L-16; blocks all API diagnosis including login |
| **H6** | Auth handler regression | **INCONCLUSIVE** | Cannot exercise handler while surface **404** |
| **H7** | Runtime secret mapping mismatch | **INCONCLUSIVE** | Env names present on Vercel; runtime mapping not proven without API surface |
| **H8** | Rate-limit/service protection | **INCONCLUSIVE** | No logs; L-22 message `Service unavailable` is also generic catch-all in handler |
| **H9** | Route works but internal auth adapter fails | **LIKELY** for L-22 **500** (historical) | `slimAuthLoginHandler` catch-all → **500** `auth_invalid_request` for non-`HttpError` throws (e.g. Prisma/JWT) |

**L-22 vs L-24:** L-22 **500** occurred when smoke **PASS** (API serverless). L-24 session shows a **new** surface regression (**404**), which is a **separate blocking fault** and must be corrected before re-testing login or snapshot.

---

## 6. Source inspection summary (read-only)

| Item | Finding |
|------|---------|
| Route ownership | `server/api/index.mjs` — `POST /api/auth/login` → `slimAuthLoginHandler.mjs` |
| Handler | `handleSlimAuthLoginPost` — bounded body, Zod parse, optional owner-only **403**, `loginUser` + 20s timeout |
| **500** mapping | `mapLoginErrorToResponse` default branch → **500** + `Service unavailable` + `auth_invalid_request` |
| **401** mapping | `loginUser` invalid credentials / inactive user |
| **503** mapping | `AUTH_LOGIN_TIMEOUT` only |
| Dependencies | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`; Prisma `user` + `refreshToken` |
| Operator tool | `staging-auth-checkout-operator.mjs` `login` — **not** run in L-24 |

---

## 7. Deployment / env presence (names only)

| Check | Result |
|-------|--------|
| Tool | `vercel env ls production` (project `zora-walat-api-staging`) |
| `DATABASE_URL` | **present** |
| `JWT_ACCESS_SECRET` | **present** |
| `JWT_REFRESH_SECRET` | **present** |
| `NODE_ENV` | **present** |
| Values | **not** read or printed |

---

## 8. Non-mutating dependency probe

| Probe | Result |
|-------|--------|
| `GET /api/ready` | HTTP **404** (consistent with surface regression) |
| Mutation | **none** |

---

## 9. Runtime logs

| Field | Value |
|-------|-------|
| Attempted | `vercel logs` with `--no-follow`, `--since 48h` / `7d`, queries `status:500`, `auth_slim` |
| Result | **No logs found** for project |
| **RUNTIME_LOGS_CAPTURED** | **false** |

---

## 10. No-mutation attestation

| Domain | Mutated? |
|--------|----------|
| Deploy / redeploy | **NO** |
| Env / secrets | **NO** |
| Login / token refresh | **NO** |
| Snapshot / doctor / obs capture | **NO** |
| DB / payment / provider | **NO** |

---

## 11. Proposed next gated steps (not executed)

1. **Surface recovery (blocking):** Staging API surface correction redeploy from `server/` only — same class as [L-18](./ZORA_WALAT_L18_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md); requires explicit operator phrase (e.g. L-18 or successor).
2. **After smoke PASS:** One token refresh retry (L-22-class authorization) — **no** repeated login in same session.
3. **After valid token:** One full read-only snapshot (L-21-class authorization).
4. **If login still HTTP 500 after surface PASS:** Targeted read-only follow-up — `/api/ready` DB enum, redacted `auth_slim_denied` logs — **no** fix implementation in evidence track.

---

## 12. Cross-links

| Document | Role |
|----------|------|
| [L-22](./ZORA_WALAT_L22_CORE10_TOKEN_REFRESH_AFTER_L21_BLOCKED_TOKEN_EVIDENCE_2026_05_31.md) | Trigger **500** |
| [L-23 gate](./ZORA_WALAT_L23_CORE10_STAGING_AUTH_LOGIN_HTTP500_DIAGNOSIS_GATE_2026_05_31.md) | L-24 policy |
| [L-16](./ZORA_WALAT_L16_CORE10_STAGING_AUTH_LOGIN_ROUTE_SURFACE_VERIFICATION_EVIDENCE_2026_05_30.md) | Prior **404** / `nextjs_frontend` pattern |

---

**Filed by:** Cursor agent session (engineering evidence only)  
**Commit:** Pending operator review — **no commit** unless operator requests.
