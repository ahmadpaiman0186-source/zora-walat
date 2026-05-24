# STR-02 — Vercel Read-Only Routing Diagnostics Evidence

**Date:** 2026-05-24
**Gate:** G-02 · STR-02 404 investigation
**Parent:** [404 root-cause investigation](../../ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md)

**Policy:** Read-only Vercel dashboard review. **No deploy. No settings edit. No API calls.**

---

## Purpose

Register **read-only** Vercel diagnostic evidence to discriminate routing hypotheses for STR-02 **404 ERR / Not Found** with **no runtime log correlation**.

---

## Evidence status (summary)

| Item | Status |
|------|--------|
| Diagnostic pack scaffold | **CREATED** (PR #68) |
| Vercel project settings (VRC-D01, VRC-D02) | **CAPTURED** |
| Supporting build settings (VRC-D02A…D02D) | **CAPTURED** |
| Deployment source / output / functions (VRC-D03…D05) | **PENDING CAPTURE** |
| Domain alias mapping (VRC-D06) | **PENDING CAPTURE** |
| Runtime log no-correlation (VRC-D07) | **PENDING CAPTURE** (cross-ref VRC-01/02) |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Staging replay | **FAILED / INCONCLUSIVE** |
| Production / real-money / pilot | **NO-GO** |

Full manifest: [EVIDENCE_MANIFEST.md](./EVIDENCE_MANIFEST.md)

---

## Key captured values (2026-05-24)

| Setting | Observed value |
|---------|----------------|
| Root Directory | **`./`** (repo root — **not** `server`) |
| Node.js Version | **24.x** |
| Ignored Build Step | **Automatic** |
| On-demand Concurrent Builds | **Disabled** (queued, one at a time) |
| Build Machine | **Team Default (None)** |
| Deployment Checks | **No checks configured** |
| Rolling Releases | **Disabled** |
| Prioritize Production Builds | **Enabled** |

**Diagnostic note:** Root Directory = `./` **strengthens** monorepo-root routing mismatch hypothesis (**H2**). Root cause **NOT CONFIRMED**.

---

## Filed screenshots

| File | Evidence ID |
|------|-------------|
| [VERCEL-STAGING-PROJECT-SETTINGS-GENERAL-ROOT-DIRECTORY-001.png](./VERCEL-STAGING-PROJECT-SETTINGS-GENERAL-ROOT-DIRECTORY-001.png) | VRC-D01 |
| [VERCEL-STAGING-PROJECT-SETTINGS-FRAMEWORK-BUILD-002.png](./VERCEL-STAGING-PROJECT-SETTINGS-FRAMEWORK-BUILD-002.png) | VRC-D02 |
| [VERCEL-STAGING-PROJECT-SETTINGS-BUILD-NODE-IGNORED-BUILD-002A.png](./VERCEL-STAGING-PROJECT-SETTINGS-BUILD-NODE-IGNORED-BUILD-002A.png) | VRC-D02A |
| [VERCEL-STAGING-PROJECT-SETTINGS-BUILD-CONCURRENT-BUILDS-002B.png](./VERCEL-STAGING-PROJECT-SETTINGS-BUILD-CONCURRENT-BUILDS-002B.png) | VRC-D02B |
| [VERCEL-STAGING-PROJECT-SETTINGS-BUILD-MACHINE-CHECKS-002C.png](./VERCEL-STAGING-PROJECT-SETTINGS-BUILD-MACHINE-CHECKS-002C.png) | VRC-D02C |
| [VERCEL-STAGING-PROJECT-SETTINGS-BUILD-ROLLING-RELEASES-002D.png](./VERCEL-STAGING-PROJECT-SETTINGS-BUILD-ROLLING-RELEASES-002D.png) | VRC-D02D |

---

## Document map

| Doc | Role |
|-----|------|
| [EVIDENCE_MANIFEST.md](./EVIDENCE_MANIFEST.md) | Screenshot IDs + status |
| [Read-only diagnostics](../../ZORA_WALAT_STR02_VERCEL_READONLY_ROUTING_DIAGNOSTICS_2026_05_24.md) | Master diagnostic pack |
| [Project root checklist](../../ZORA_WALAT_STR02_VERCEL_PROJECT_ROOT_EVIDENCE_CHECKLIST_2026_05_24.md) | Root Directory / framework |
| [Domain mapping checklist](../../ZORA_WALAT_STR02_VERCEL_DOMAIN_MAPPING_EVIDENCE_CHECKLIST_2026_05_24.md) | Alias / domain |
| [Deployment output checklist](../../ZORA_WALAT_STR02_VERCEL_DEPLOYMENT_OUTPUT_EVIDENCE_CHECKLIST_2026_05_24.md) | Build output / functions |
| [Diagnostic verdict matrix](../../ZORA_WALAT_STR02_VERCEL_DIAGNOSTIC_VERDICT_MATRIX_2026_05_24.md) | Hypothesis scoring |

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

*STR-02 Vercel read-only diagnostics · D01/D02 CAPTURED · D03–D07 PENDING*
