# Evidence Manifest — STR-02 Vercel Read-Only Routing Diagnostics

**Date:** 2026-05-24
**Project:** `zora-walat-api-staging` (staging only)
**Mode:** Read-only dashboard review · **no deploy · no settings mutation**
**Capture window:** ~2026-05-24 4:32–4:40 PM (operator manual dashboard review)

**Policy:** No fabricated screenshots. Filed from Telegram UWP operator captures.

---

## 1. Required captures

| Evidence ID | Filename | Source (Vercel Dashboard) | Status | Key values recorded |
|-------------|----------|---------------------------|--------|---------------------|
| **VRC-D01** | `VERCEL-STAGING-PROJECT-SETTINGS-GENERAL-ROOT-DIRECTORY-001.png` | Settings → **Build and Deployment** → Root Directory | **CAPTURED** | Project **`zora-walat-api-staging`**; **Root Directory = `./`**; Include files outside root **Enabled**; Skip deployments when no root changes **Disabled** |
| **VRC-D02** | `VERCEL-STAGING-PROJECT-SETTINGS-FRAMEWORK-BUILD-002.png` | Settings → **Build and Deployment** (page overview) | **CAPTURED** | **Build Settings** / **Framework Settings** entry; **Build and Deployment** breadcrumb; same page context as D01 |
| **VRC-D02A** | `VERCEL-STAGING-PROJECT-SETTINGS-BUILD-NODE-IGNORED-BUILD-002A.png` | Build and Deployment → Ignored Build Step + Node.js | **CAPTURED** (supporting) | **Ignored Build Step = Automatic**; **Node.js Version = 24.x** |
| **VRC-D02B** | `VERCEL-STAGING-PROJECT-SETTINGS-BUILD-CONCURRENT-BUILDS-002B.png` | Build and Deployment → On-Demand Concurrent Builds | **CAPTURED** (supporting) | **Disable on-demand concurrent builds** — queued, max one at a time |
| **VRC-D02C** | `VERCEL-STAGING-PROJECT-SETTINGS-BUILD-MACHINE-CHECKS-002C.png` | Build and Deployment → Build Machine + Deployment Checks | **CAPTURED** (supporting) | **Build Machine = Team Default (None)**; **Deployment Checks = No checks configured** |
| **VRC-D02D** | `VERCEL-STAGING-PROJECT-SETTINGS-BUILD-ROLLING-RELEASES-002D.png` | Build and Deployment → Rolling Releases | **CAPTURED** (supporting) | **Rolling Releases = Disabled**; **Prioritize Production Builds = Enabled** |
| **VRC-D03** | `VERCEL-STAGING-LATEST-DEPLOYMENT-SOURCE-COMMIT-003.png` | Deployments → latest deploy | **PENDING CAPTURE** | — |
| **VRC-D04** | `VERCEL-STAGING-LATEST-DEPLOYMENT-BUILD-OUTPUT-004.png` | Deployment → Build output | **PENDING CAPTURE** | — |
| **VRC-D05** | `VERCEL-STAGING-LATEST-DEPLOYMENT-FUNCTIONS-ROUTES-005.png` | Deployment → Functions / Routes | **PENDING CAPTURE** | — |
| **VRC-D06** | `VERCEL-STAGING-DOMAINS-ALIAS-MAPPING-006.png` | Settings → Domains | **PENDING CAPTURE** | — |
| **VRC-D07** | `VERCEL-STAGING-LOGS-NO-WEBHOOK-RUNTIME-CORRELATION-007.png` | Logs → no webhook match | **PENDING CAPTURE** | Cross-ref VRC-01/02 filed |

---

## 2. Ingestion record

| Field | Value |
|-------|-------|
| Source paths searched | Downloads, Pictures, Desktop, Telegram UWP, Telegram Desktop |
| Source files ingested | 5 distinct PNGs from Telegram UWP (2026-05-24 ~16:39–16:40) |
| Output files filed | 6 PNGs (D02 shares page context with D01 source frame) |
| Redaction applied | Browser URL bar black-bar redaction (team slug / account identifier) |
| Evidence-critical values preserved | Project name, Root Directory `./`, framework/build/node settings |

---

## 3. Diagnostic read (D01/D02 — not root-cause confirmation)

| Observation | Implication |
|-------------|-------------|
| **Root Directory = `./`** (repo root, not `server`) | **Strengthens** monorepo-root vs `server/` routing mismatch hypothesis (**H2**) |
| Repo root `vercel.json` = Next.js | Deploy from `./` may **not** expose `POST /webhooks/stripe` |
| Intended API layout under `server/` | Mismatch between intended deploy root and configured root |
| Node.js **24.x** | Build/runtime version recorded; does **not** explain 404 alone |
| Ignored Build Step **Automatic** | Build skip policy recorded; not routing root cause |

**Conservative rule:** Root cause remains **NOT CONFIRMED** until VRC-D03…D07 filed and hypothesis matrix updated.

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
| M-V02A | VRC-D02A…D02D filed (supporting) | **CAPTURED** |
| M-V03 | VRC-D03 filed | **PENDING CAPTURE** |
| M-V04 | VRC-D04 filed | **PENDING CAPTURE** |
| M-V05 | VRC-D05 filed | **PENDING CAPTURE** |
| M-V06 | VRC-D06 filed | **PENDING CAPTURE** |
| M-V07 | VRC-D07 filed | **PENDING CAPTURE** |
| M-V08 | [Diagnostic verdict matrix](../../ZORA_WALAT_STR02_VERCEL_DIAGNOSTIC_VERDICT_MATRIX_2026_05_24.md) updated post-capture | **PARTIAL** (D01/D02 only) |

**Overall manifest:** **PARTIAL** · project settings **CAPTURED** · deployment/domain/logs **PENDING** · root cause **NOT CONFIRMED**

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

*Manifest · STR-02 Vercel read-only diagnostics · D01/D02 CAPTURED · D03–D07 PENDING · no deploy*
