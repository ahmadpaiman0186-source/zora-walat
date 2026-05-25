# STR-02 — Vercel Read-Only Routing Diagnostics Evidence

**Date:** 2026-05-24
**Gate:** G-02 · STR-02 404 investigation
**Parent:** [404 root-cause investigation](../../ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md)

**Policy:** Read-only Vercel dashboard review. **No deploy. No settings edit. No API calls.**

---

## Evidence status (summary)

| Item | Status |
|------|--------|
| Vercel project settings (VRC-D01, D02, D02A…D02D) | **CAPTURED** |
| Deployment source / build / functions (VRC-D03…D05) | **CAPTURED** |
| Domain mapping (VRC-D06) | **CAPTURED** |
| Runtime log no-correlation (VRC-D07, D07B) | **CAPTURED** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Staging replay | **FAILED / INCONCLUSIVE** |
| Production / real-money / pilot | **NO-GO** |

Full manifest: [EVIDENCE_MANIFEST.md](./EVIDENCE_MANIFEST.md)

---

## Critical findings (diagnostic — not root-cause proof)

| Finding | Evidence |
|---------|----------|
| Root Directory = **`./`** (not `server`) | VRC-D01 — **strengthens H2** |
| Active deploy **Fa18u4Nr** — **main** @ **bc5dec9** (PR #69) Ready | VRC-D03, D04 |
| **`/webhooks/stripe` missing** from deployment Functions list | VRC-D05 — **strengthens H4** |
| **`zora-walat-api-staging.vercel.app`** on production deployment | VRC-D06 |
| No logs for **`"/webhooks/stripe"`** or **`stripe`** | VRC-D07, D07B |

---

## Filed screenshots (12 PNGs)

| File | Evidence ID |
|------|-------------|
| [VERCEL-STAGING-PROJECT-SETTINGS-GENERAL-ROOT-DIRECTORY-001.png](./VERCEL-STAGING-PROJECT-SETTINGS-GENERAL-ROOT-DIRECTORY-001.png) | VRC-D01 |
| [VERCEL-STAGING-PROJECT-SETTINGS-FRAMEWORK-BUILD-002.png](./VERCEL-STAGING-PROJECT-SETTINGS-FRAMEWORK-BUILD-002.png) | VRC-D02 |
| [VERCEL-STAGING-PROJECT-SETTINGS-BUILD-NODE-IGNORED-BUILD-002A.png](./VERCEL-STAGING-PROJECT-SETTINGS-BUILD-NODE-IGNORED-BUILD-002A.png) | VRC-D02A |
| [VERCEL-STAGING-PROJECT-SETTINGS-BUILD-CONCURRENT-BUILDS-002B.png](./VERCEL-STAGING-PROJECT-SETTINGS-BUILD-CONCURRENT-BUILDS-002B.png) | VRC-D02B |
| [VERCEL-STAGING-PROJECT-SETTINGS-BUILD-MACHINE-CHECKS-002C.png](./VERCEL-STAGING-PROJECT-SETTINGS-BUILD-MACHINE-CHECKS-002C.png) | VRC-D02C |
| [VERCEL-STAGING-PROJECT-SETTINGS-BUILD-ROLLING-RELEASES-002D.png](./VERCEL-STAGING-PROJECT-SETTINGS-BUILD-ROLLING-RELEASES-002D.png) | VRC-D02D |
| [VERCEL-STAGING-LATEST-DEPLOYMENT-SOURCE-COMMIT-003.png](./VERCEL-STAGING-LATEST-DEPLOYMENT-SOURCE-COMMIT-003.png) | VRC-D03 |
| [VERCEL-STAGING-LATEST-DEPLOYMENT-BUILD-OUTPUT-004.png](./VERCEL-STAGING-LATEST-DEPLOYMENT-BUILD-OUTPUT-004.png) | VRC-D04 |
| [VERCEL-STAGING-LATEST-DEPLOYMENT-FUNCTIONS-ROUTES-005.png](./VERCEL-STAGING-LATEST-DEPLOYMENT-FUNCTIONS-ROUTES-005.png) | VRC-D05 |
| [VERCEL-STAGING-DOMAINS-ALIAS-MAPPING-006.png](./VERCEL-STAGING-DOMAINS-ALIAS-MAPPING-006.png) | VRC-D06 |
| [VERCEL-STAGING-LOGS-NO-WEBHOOK-RUNTIME-CORRELATION-007.png](./VERCEL-STAGING-LOGS-NO-WEBHOOK-RUNTIME-CORRELATION-007.png) | VRC-D07 |
| [VERCEL-STAGING-LOGS-NO-WEBHOOK-RUNTIME-CORRELATION-007B.png](./VERCEL-STAGING-LOGS-NO-WEBHOOK-RUNTIME-CORRELATION-007B.png) | VRC-D07B |

---

## Verdict (conservative)

| Item | Status |
|------|--------|
| STR-02 result | **404 ERR / Not Found** |
| HTTP 200 | **NOT ACHIEVED** |
| LOG-01…LOG-04 | **NOT CORRELATED / NOT CAPTURED** |
| Vercel runtime correlation | **NOT FOUND** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-02 Vercel read-only diagnostics · all captures filed · root cause NOT CONFIRMED*
