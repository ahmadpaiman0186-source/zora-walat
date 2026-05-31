# L-30 — Same-Window Server Redeploy + Token Refresh + Read-Only Staging Snapshot Evidence

**Date:** 2026-05-31  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-30** — Same-window redeploy (if required) + token refresh + read-only staging snapshot  
**Branch:** `evidence/l30-same-window-redeploy-token-refresh-readonly-snapshot-2026-05-31`  
**Base:** `a3d14ad` — Merge PR #145 (L-21 snapshot preflight abort evidence)  
**Transcript:** [l30_transcript_redacted.txt](./evidence/core10-l30-same-window-redeploy-token-refresh-readonly-snapshot-2026-05-31/l30_transcript_redacted.txt)  
**Snapshot:** [staging_snapshot_redacted.json](./evidence/core10-l30-same-window-redeploy-token-refresh-readonly-snapshot-2026-05-31/staging_snapshot_redacted.json) · SHA256 [staging_snapshot_redacted_sha256.txt](./evidence/core10-l30-same-window-redeploy-token-refresh-readonly-snapshot-2026-05-31/staging_snapshot_redacted_sha256.txt)

---

## 1. Authorization — CORE10-L30-AUTH-001

| Field | Value |
|-------|-------|
| Required phrase (verbatim) | `APPROVE L-30 SAME-WINDOW SERVER REDEPLOY TOKEN REFRESH AND FULL READ-ONLY STAGING SNAPSHOT CAPTURE ONLY` |
| **AUTHORIZATION_RECEIVED** | **true** |

**Engineering objective:** From clean `main` (`## main...origin/main`), verify staging API surface; redeploy **only if** surface fails; refresh operator token without printing secrets; capture read-only staging snapshot in the same session.

---

## 2. Reconciled session narrative (canonical)

| Fact | Value |
|------|-------|
| Main gate | `## main...origin/main` at `a3d14ad` before evidence branch |
| Surface at start | Already `api_serverless` — health/ready/smoke **PASS** |
| Redeploy | **Not executed** — surface correction not required |
| Token | One `auth-check` path login — HTTP **200**, `TOKEN_VALID=true` |
| Snapshot | Operator read-only export **completed**; SHA256 filed |
| Secrets | **Not** printed in evidence (`SECRET_PRINTED=false`) |
| Staging mutations | **None** detected (`MUTATION_DETECTED=false`) |

---

## 3. Required evidence matrix

| Field | Value |
|-------|-------|
| **L30_MODE** | `same_window_redeploy_token_refresh_readonly_snapshot` |
| **STARTING_MAIN_COMMIT** | `a3d14ad` |
| **PR145_MERGED_CONFIRMED** | **true** |
| **MAIN_CLEAN_SYNCED** | **true** |
| **MAIN_GATE_PRECHECK** | **true** |
| **SURFACE_HEALTH_BEFORE** | **PASS** — HTTP **200** |
| **SURFACE_READY_BEFORE** | **PASS** — HTTP **200** |
| **SURFACE_SMOKE_BEFORE** | **PASS** — exit **0** |
| **SURFACE_STATE_BEFORE** | `api_serverless` |
| **REDEPLOY_REQUIRED** | **false** |
| **DEPLOY_GUARD_PASS** | `not_run` |
| **REDEPLOY_EXECUTED** | **false** |
| **REDEPLOY_ATTEMPT_COUNT** | **0** |
| **DEPLOY_TARGET** | `not_run` |
| **VERCEL_PROJECT** | `not_run` |
| **DEPLOYMENT_ID** | `not_run` |
| **ALIAS** | `https://zora-walat-api-staging.vercel.app` |
| **API_HEALTH_AFTER** | **PASS** — HTTP **200** |
| **API_READY_AFTER** | **PASS** — HTTP **200** |
| **API_SURFACE_AFTER** | **PASS** |
| **LOGIN_ROUTE_REACHABLE** | **true** |
| **LOGIN_ROUTE_NOT_404** | **true** (`login_route` **400**) |
| **HAS_EMAIL** | **true** |
| **HAS_PASSWORD** | **true** |
| **LOGIN_ATTEMPT_COUNT** | **1** |
| **LOGIN_HTTP** | **200** |
| **LOGIN_RESULT** | `success` |
| **TOKEN_PRESENT** | **true** |
| **TOKEN_VALID** | **true** |
| **TOKEN_STATE** | `valid` |
| **SECRET_PRINTED** | **false** |
| **TOKEN_PRINTED** | **false** |
| **PASSWORD_PRINTED** | **false** |
| **ENV_VALUES_PRINTED** | **false** |
| **CREDENTIAL_COMMITTED** | **false** |
| **SNAPSHOT_STARTED** | **true** |
| **SNAPSHOT_COMPLETED** | **true** |
| **SNAPSHOT_MODE** | `read_only` |
| **SNAPSHOT_SHA256** | `af3c0cc70b799543f852e1aa230c3e3de543737d73cc09801165f46af3c16c9d` |
| **SNAPSHOT_RECORD_COUNTS** | orders **1** · refundableCandidates **0** · stripeWebhookEvents **0** · paymentEvents **0** · auditLogs **0** |
| **SNAPSHOT_ENUM_SUMMARY** | `ORDER_STATUS=FULFILLED` · `PAID_CONFIRMED=true` · `FULFILLMENT_ATTEMPT_COUNT=1` · `orderIdSuffix=unknown` (redacted in JSON) |
| **SNAPSHOT_SECRET_REDACTION_CONFIRMED** | **true** |
| **MUTATION_DETECTED** | **false** |
| **DB_MUTATION** | **false** |
| **PAYMENT_MUTATION** | **false** |
| **ORDER_MUTATION** | **false** |
| **WALLET_MUTATION** | **false** |
| **PROVIDER_MUTATION** | **false** |
| **STRIPE_MUTATION** | **false** |
| **RELOADLY_MUTATION** | **false** |
| **SELF_HEALING_APPLY** | **false** |
| **RUNTIME_DOCTOR_EXECUTED** | **false** |
| **OBSERVABILITY_CAPTURE_EXECUTED** | **false** |
| **PRODUCTION_READY** | **false** |
| **REAL_MONEY_READY** | **false** |
| **CONTROLLED_PILOT_READY** | **false** |
| **MARKET_READY** | **false** |
| **NEXT_GATE** | CORE10 staging Runtime Doctor + observability — **separate authorization** |

---

## 4. Verdict — CORE10-L30-VERDICT-001

| Item | Status |
|------|--------|
| **CORE10-L30-VERDICT-001** | **SAME_WINDOW_SNAPSHOT_SUCCESS** |
| Redeploy | **NOT EXECUTED** (surface already PASS) |
| Token + snapshot | **SUCCESS** in same session |
| **CORE10-BLK-CAPTURE-001** | **PARTIAL_MINIMUM** — operator export only; full DB/webhook/audit export **not** proven |

**Conservative launch posture:** production · pilot · real-money · market — **NO-GO**.

---

## 5. Snapshot scope attestation

| Method | Executed? |
|--------|-----------|
| `staging-api-smoke` / health / ready | **YES** |
| `auth-check` / login (once) | **YES** |
| `status-check` | **YES** |
| `phase1-truth-check` | **YES** |
| GET refundable-candidates | **YES** — HTTP **200**, count **0** |
| DB export / Stripe / Reloadly / mutations | **NO** |

---

## 6. No-mutation attestation

| Domain | Mutated? |
|--------|----------|
| Vercel env / secrets | **NO** |
| Gitignored token file | **YES** (local only — not committed) |
| Staging DB / orders / payments | **NO** |

---

## 7. Cross-links

| Document | Role |
|----------|------|
| [L-29](./ZORA_WALAT_L29_SURFACE_DRIFT_CONTROL_SAME_WINDOW_TOKEN_REFRESH_EVIDENCE_2026_05_31.md) | Prior redeploy+token pattern when surface drifted |
| [L-21](./ZORA_WALAT_L21_CORE10_FULL_READONLY_STAGING_SNAPSHOT_CAPTURE_EVIDENCE_2026_05_30.md) | Prior **BLOCKED** preflight |
| [Capture blocker](./ZORA_WALAT_CORE10_CAPTURE_BLOCKER_OR_ABORT_RECORD_2026_05_30.md) | **CORE10-BLK-CAPTURE-001** |

---

**Filed by:** Cursor agent session (engineering evidence only)  
**Commit:** Pending operator review — **no commit** unless operator requests.
