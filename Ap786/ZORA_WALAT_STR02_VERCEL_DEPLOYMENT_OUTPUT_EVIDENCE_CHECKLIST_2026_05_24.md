# STR-02 — Vercel Deployment Output Evidence Checklist

**Date:** 2026-05-24
**Parent:** [Vercel read-only diagnostics](./ZORA_WALAT_STR02_VERCEL_READONLY_ROUTING_DIAGNOSTICS_2026_05_24.md)

**Policy:** Read-only. **No redeploy.**

---

## 1. Target deployment

| Field | Captured value |
|-------|----------------|
| Project | `zora-walat-api-staging` |
| Deployment ID | **Fa18u4Nr** |
| Branch | **`main`** |
| Commit | **bc5dec9** (PR **#69**) |
| Status | **Ready / Latest** · **Production / Current** |

---

## 2. Capture checklist

| # | Check | Evidence | Status |
|---|-------|----------|--------|
| O-01 | Latest active deployment selected | VRC-D03 | ☑ **CAPTURED** — **Fa18u4Nr** |
| O-02 | Branch **`main`** visible | VRC-D03, D04 | ☑ **CAPTURED** |
| O-03 | Commit SHA **bc5dec9** visible | VRC-D03, D04 | ☑ **CAPTURED** |
| O-04 | Deployment **Ready** | VRC-D03 | ☑ **CAPTURED** |
| O-05 | Build log tab open | VRC-D04 | ☑ **CAPTURED** |
| O-06 | Build context (CLI **54.4.1**, **iad1**, **1 warning**) | VRC-D04 | ☑ **CAPTURED** |
| O-07 | Functions / Resources tab open | VRC-D05 | ☑ **CAPTURED** |
| O-08 | Functions listed: `/_not-found`, `/cancel`, `/history`, `/index`, `/success` | VRC-D05 | ☑ **CAPTURED** |
| O-09 | **`/webhooks/stripe` NOT in functions list** | VRC-D05 | ☑ **RECORDED** — **missing** |
| O-10 | No redeploy triggered | Manifest §6 | ☑ **YES** |

---

## 3. Repo expectation vs observation

| Artifact | Expected in API deploy (`server/`) | Observed (Fa18u4Nr) |
|----------|-----------------------------------|---------------------|
| `api/index.mjs` serverless entry | **YES** | **NOT VISIBLE** in Resources / Functions list |
| `POST /webhooks/stripe` route | **YES** (slim path) | **NOT SHOWN** — **strengthens H4** |
| Next.js pages (`/index`, `/success`, etc.) | If root = `./` | **SHOWN** — consistent with monorepo root deploy |

---

## 4. Verdict

| Item | Status |
|------|--------|
| VRC-D03 / D04 / D05 | **CAPTURED** |
| Deployed route surface includes webhook | **NO** — `/webhooks/stripe` **missing** |
| Root cause | **NOT CONFIRMED** (H4 **strengthened**) |

---

*Deployment output checklist · D03–D05 CAPTURED · webhook route missing on deploy surface*
