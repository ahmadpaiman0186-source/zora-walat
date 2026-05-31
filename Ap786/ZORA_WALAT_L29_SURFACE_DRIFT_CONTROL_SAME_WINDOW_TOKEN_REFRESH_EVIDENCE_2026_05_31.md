# L-29 — Surface Drift Control / Same-Window Surface Correction + Token Refresh Evidence

**Date:** 2026-05-31  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-29** — Surface drift control: same-window redeploy + read-only token refresh  
**Branch:** `evidence/l29-surface-drift-control-same-window-token-refresh-2026-05-31`  
**Base:** `26eff81` — Merge PR #143 (L-28 **BLOCKED_PREFLIGHT**)  
**Transcript:** [l29_transcript_redacted.txt](./evidence/core10-l29-surface-drift-control-same-window-token-refresh-2026-05-31/l29_transcript_redacted.txt)

---

## 1. Authorization — CORE10-L29-AUTH-001

| Field | Value |
|-------|-------|
| Required phrase (verbatim) | `APPROVE L-29 SURFACE DRIFT CONTROL SAME-WINDOW SERVER REDEPLOY AND READ-ONLY TOKEN REFRESH ONLY` |
| **AUTHORIZATION_RECEIVED** | **true** |

**Engineering objective:** Break the blind L-25/L-27 redeploy → L-26/L-28 token **404** loop by coupling surface correction and token refresh in **one** session with measured same-window delta.

---

## 2. Required evidence matrix

| Field | Value |
|-------|-------|
| **L29_MODE** | `surface_drift_control_same_window_token_refresh` |
| **STARTING_MAIN_COMMIT** | `26eff81` |
| **CURRENT_SURFACE_HEALTH_BEFORE** | **FAIL** — HTTP **404** |
| **CURRENT_SURFACE_SMOKE_BEFORE** | **FAIL** — exit **1** |
| **CURRENT_READY_BEFORE** | **FAIL** — HTTP **404** |
| **SURFACE_STATE_BEFORE** | `nextjs_frontend` |
| **REDEPLOY_REQUIRED** | **true** |
| **DEPLOY_GUARD_PASS** | **true** |
| **REDEPLOY_EXECUTED** | **true** |
| **REDEPLOY_ATTEMPT_COUNT** | **1** |
| **DEPLOY_TARGET** | `server_only` |
| **VERCEL_PROJECT** | `zora-walat-api-staging` |
| **DEPLOYMENT_ID** | `dpl_FSuumMX2NTadaxGYQgEUqdqmBe9y` |
| **ALIAS** | `https://zora-walat-api-staging.vercel.app` |
| **API_HEALTH_AFTER** | **PASS** — HTTP **200** |
| **API_READY_AFTER** | **PASS** — HTTP **200** `database_ok` |
| **API_SURFACE_AFTER** | **PASS** |
| **LOGIN_ROUTE_REACHABLE** | **true** |
| **LOGIN_ROUTE_NOT_404** | **true** (`login_route` **400**) |
| **SAME_WINDOW_DELTA_SECONDS** | **0.49** (surface PASS → login attempt) |
| **HAS_EMAIL** | **true** |
| **HAS_PASSWORD** | **true** |
| **LOGIN_ATTEMPT_COUNT** | **1** |
| **LOGIN_HTTP** | **200** |
| **LOGIN_RESULT** | `success` |
| **TOKEN_PRESENT** | **true** |
| **TOKEN_VALID** | **true** |
| **TOKEN_STATE** | `valid` |
| **TOKEN_PRINTED** | **false** |
| **PASSWORD_PRINTED** | **false** |
| **ENV_VALUES_PRINTED** | **false** |
| **CREDENTIAL_COMMITTED** | **false** |
| **STATUS_CHECK_EXECUTED** | **true** |
| **STATUS_CHECK_HTTP** | **200** |
| **STATUS_CHECK_RESULT** | `ok` |
| **FULL_SNAPSHOT_EXECUTED** | **false** |
| **RUNTIME_DOCTOR_EXECUTED** | **false** |
| **OBSERVABILITY_CAPTURE_EXECUTED** | **false** |
| **DB_MUTATION** | **false** |
| **PAYMENT_MUTATION** | **false** |
| **PROVIDER_MUTATION** | **false** |
| **SELF_HEALING_APPLY** | **false** |
| **PRODUCTION_READY** | **false** |
| **REAL_MONEY_READY** | **false** |
| **NEXT_GATE** | L-21-class full read-only staging snapshot — `APPROVE L-21 CORE-10 FULL READ-ONLY STAGING SNAPSHOT CAPTURE ONLY` (separate authorization; preflight smoke + `TOKEN_VALID=true` required) |

---

## 3. Verdict — CORE10-L29-VERDICT-001

| Item | Status |
|------|--------|
| **CORE10-L29-VERDICT-001** | **SAME_WINDOW_SUCCESS** |
| Surface drift at session start | **CONFIRMED** (`nextjs_frontend` / **404**) |
| Same-window redeploy + token refresh | **SUCCESS** |
| Operator token | **VALID** (gitignored file updated; body **not** in evidence) |
| Full snapshot | **NOT EXECUTED** (by design) |
| Runtime Doctor / observability | **NOT VERIFIED** |
| **CORE10-BLK-CAPTURE-001** | **OPEN** — snapshot still pending |

**Conservative launch posture:** production · pilot · real-money · market — **NO-GO**.

---

## 4. Pattern addressed (L-25 → L-28)

| Step | Surface at token attempt | Outcome |
|------|--------------------------|---------|
| L-25 redeploy | **PASS** | — |
| L-26 token | **404** (later) | **BLOCKED_PREFLIGHT** |
| L-27 redeploy | **PASS** | — |
| L-28 token | **404** (later) | **BLOCKED_PREFLIGHT** |
| **L-29** | Redeploy **then** token in **0.49s** | **SUCCESS** |

**Lesson filed:** Token refresh must run in the **same window** immediately after surface **PASS**, not in a separate later session.

---

## 5. No-mutation attestation

| Domain | Mutated? |
|--------|----------|
| Vercel env / secrets | **NO** |
| Gitignored token file | **YES** (local only — not committed) |
| Login / status-check | **Read-only** operator paths only |
| Snapshot / doctor / obs | **NO** |
| DB / payment / provider | **NO** |

---

## 6. Cross-links

| Document | Role |
|----------|------|
| [L-28](./ZORA_WALAT_L28_CORE10_TOKEN_REFRESH_AFTER_L27_SURFACE_PASS_EVIDENCE_2026_05_31.md) | Prior **BLOCKED_PREFLIGHT** |
| [L-27](./ZORA_WALAT_L27_STAGING_API_SURFACE_CORRECTION_REDEPLOY_AFTER_L26_BLOCKED_PREFLIGHT_EVIDENCE_2026_05_31.md) | Last redeploy before L-28 |
| [L-21 gate](./ZORA_WALAT_L20_CORE10_FULL_READONLY_STAGING_SNAPSHOT_AUTHORIZATION_GATE_2026_05_30.md) | Snapshot phrase policy |

---

**Filed by:** Cursor agent session (engineering evidence only)  
**Commit:** Pending operator review — **no commit** unless operator requests.
