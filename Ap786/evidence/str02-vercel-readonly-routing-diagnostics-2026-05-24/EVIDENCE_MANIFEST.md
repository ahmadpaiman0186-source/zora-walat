# Evidence Manifest — STR-02 Vercel Read-Only Routing Diagnostics

**Date:** 2026-05-24
**Project:** `zora-walat-api-staging` (staging only)
**Mode:** Read-only dashboard review · **no deploy · no settings mutation**
**Capture windows:** ~16:39–16:40 PM (project settings) · ~17:46–17:49 PM (deployment/domain/logs)

**Policy:** No fabricated screenshots. Filed from Telegram UWP operator captures.

---

## 1. Required captures

| Evidence ID | Filename | Source (Vercel Dashboard) | Status | Key values recorded |
|-------------|----------|---------------------------|--------|---------------------|
| **VRC-D01** | `VERCEL-STAGING-PROJECT-SETTINGS-GENERAL-ROOT-DIRECTORY-001.png` | Settings → **Build and Deployment** → Root Directory | **CAPTURED** | **`zora-walat-api-staging`**; **Root Directory = `./`** |
| **VRC-D02** | `VERCEL-STAGING-PROJECT-SETTINGS-FRAMEWORK-BUILD-002.png` | Settings → **Build and Deployment** (overview) | **CAPTURED** | Build Settings / Framework Settings entry (prior capture retained) |
| **VRC-D02A** | `VERCEL-STAGING-PROJECT-SETTINGS-BUILD-NODE-IGNORED-BUILD-002A.png` | Ignored Build Step + Node.js | **CAPTURED** (supporting) | **Automatic**; **Node.js 24.x** |
| **VRC-D02B** | `VERCEL-STAGING-PROJECT-SETTINGS-BUILD-CONCURRENT-BUILDS-002B.png` | On-Demand Concurrent Builds | **CAPTURED** (supporting) | Disabled — one at a time |
| **VRC-D02C** | `VERCEL-STAGING-PROJECT-SETTINGS-BUILD-MACHINE-CHECKS-002C.png` | Build Machine + Deployment Checks | **CAPTURED** (supporting) | Team Default (None); no checks |
| **VRC-D02D** | `VERCEL-STAGING-PROJECT-SETTINGS-BUILD-ROLLING-RELEASES-002D.png` | Rolling Releases | **CAPTURED** (supporting) | Rolling disabled; prioritize prod enabled |
| **VRC-D03** | `VERCEL-STAGING-LATEST-DEPLOYMENT-SOURCE-COMMIT-003.png` | Deployment **Fa18u4Nr** → Details | **CAPTURED** | **Ready / Latest**; **Production / Current**; **main**; **bc5dec9**; **PR #69** |
| **VRC-D04** | `VERCEL-STAGING-LATEST-DEPLOYMENT-BUILD-OUTPUT-004.png` | Deployment **Fa18u4Nr** → Build Logs | **CAPTURED** | **main** / **bc5dec9** / **PR #69**; **Vercel CLI 54.4.1**; **Washington, D.C. (iad1)**; **1 warning** |
| **VRC-D05** | `VERCEL-STAGING-LATEST-DEPLOYMENT-FUNCTIONS-ROUTES-005.png` | Deployment **Fa18u4Nr** → Resources / Functions | **CAPTURED** | Functions: `/_not-found`, `/cancel`, `/history`, `/index`, `/success` — **`/webhooks/stripe` NOT SHOWN** |
| **VRC-D06** | `VERCEL-STAGING-DOMAINS-ALIAS-MAPPING-006.png` | Project **Overview** → Production Deployment domains | **CAPTURED** | **`zora-walat-api-staging.vercel.app`** listed; **Ready** production deployment; **main** / **bc5dec9** |
| **VRC-D07** | `VERCEL-STAGING-LOGS-NO-WEBHOOK-RUNTIME-CORRELATION-007.png` | Deployment **Fa18u4Nr** → Logs | **CAPTURED** | Search **`"/webhooks/stripe"`** → **No logs found** |
| **VRC-D07B** | `VERCEL-STAGING-LOGS-NO-WEBHOOK-RUNTIME-CORRELATION-007B.png` | Same → Logs | **CAPTURED** | Search **`stripe`** → **No logs found** |

---

## 2. Ingestion record (final captures — 2026-05-24 ~17:46–17:49)

| Field | Value |
|-------|-------|
| Source | Telegram UWP (6 new PNGs + D02 preserved from prior ingest) |
| D02 handling | Prior `FRAMEWORK-BUILD-002.png` retained (Build and Deployment overview); not overwritten by duplicate Node.js frame |
| D04 source file | Operator file `VERCEL-STAGING-DOMAINS-ALIAS-MAPPING-005.png` (build logs content; renamed on filing) |
| Redaction | URL bar black-bar on D03–D07B (team slug) |
| Evidence-critical values preserved | Project, deployment **Fa18u4Nr**, commit **bc5dec9**, domain, functions list, missing `/webhooks/stripe`, no-log results |

---

## 3. Diagnostic read (not root-cause confirmation)

| Observation | Implication |
|-------------|-------------|
| **Root Directory = `./`** (prior D01) | **Strengthens H2** — monorepo root vs intended `server/` API |
| **Deployed functions lack `/webhooks/stripe`** (D05) | **Strengthens H4** — route not on deployed surface; consistent with STR-02 **404** |
| **No runtime logs** for `/webhooks/stripe` or `stripe` (D07/D07B) | **Consistent with H9** — edge/static 404 or no handler invocation |
| **Domain `zora-walat-api-staging.vercel.app` on project** (D06) | Host points to this project; does **not** prove route exists |
| Deploy **main** @ **bc5dec9** (PR #69) Ready (D03/D04) | Active deploy lineage recorded; does **not** alone confirm root cause |

**Conservative rule:** Root cause **NOT CONFIRMED**. Fix **NOT IMPLEMENTED**. Staging replay **FAILED / INCONCLUSIVE**.

---

## 4. Cross-reference (sibling folder)

| Prior ID | Filename | Location | Status |
|----------|----------|----------|--------|
| VRC-01 | `VERCEL-STAGING-STR02-NO-RUNTIME-LOGS-WEBHOOK-STRIPE-004.png` | [staging replay proof](../staging-stripe-webhook-replay-proof-pr55-2026-05-23/) | **CAPTURED / NO MATCH** |
| VRC-02 | `VERCEL-STAGING-STR02-NO-RUNTIME-LOGS-STRIPE-005.png` | Same | **CAPTURED / NO MATCH** |

---

## 5. Manifest completion checklist

| # | Criterion | Status |
|---|-----------|--------|
| M-V01 | VRC-D01 filed | **CAPTURED** |
| M-V02 | VRC-D02 filed | **CAPTURED** |
| M-V02A | VRC-D02A…D02D filed | **CAPTURED** |
| M-V03 | VRC-D03 filed | **CAPTURED** |
| M-V04 | VRC-D04 filed | **CAPTURED** |
| M-V05 | VRC-D05 filed | **CAPTURED** |
| M-V06 | VRC-D06 filed | **CAPTURED** |
| M-V07 | VRC-D07 filed | **CAPTURED** |
| M-V07B | VRC-D07B filed | **CAPTURED** |
| M-V08 | [Diagnostic verdict matrix](../../ZORA_WALAT_STR02_VERCEL_DIAGNOSTIC_VERDICT_MATRIX_2026_05_24.md) updated | **UPDATED** (partial — root cause still **NOT CONFIRMED**) |

**Overall manifest:** **COMPLETE** (all planned IDs filed) · root cause **NOT CONFIRMED**

---

## 6. Attestation

| Attestation | Result |
|-------------|--------|
| Vercel dashboard settings edited | **NO** |
| Deploy / redeploy executed | **NO** |
| Env vars edited | **NO** |
| Vercel / Stripe API called (Agent) | **NO** |
| Resend / replay executed | **NO** |
| Fix proven claim | **NO** |

---

*Manifest · STR-02 Vercel read-only diagnostics · all VRC-D01–D07B CAPTURED · root cause NOT CONFIRMED*
