# STR-02 — Vercel Deployment Output Evidence Checklist

**Date:** 2026-05-24
**Parent:** [Vercel read-only diagnostics](./ZORA_WALAT_STR02_VERCEL_READONLY_ROUTING_DIAGNOSTICS_2026_05_24.md)

**Policy:** Read-only. **No redeploy.**

---

## 1. Target deployment

| Field | Verify |
|-------|--------|
| Project | `zora-walat-api-staging` |
| Branch | **`main`** (expected) |
| Status | **Ready** |
| Window | Compare to STR-02 Resend (~May 24, 2026 2:09 PM) and DEP-01 (`0cac02e`) |

---

## 2. Capture checklist

| # | Check | Vercel path | Evidence | Status |
|---|-------|-------------|----------|--------|
| O-01 | Latest active deployment selected | Deployments | VRC-D03 | ☐ **PENDING** |
| O-02 | Branch **`main`** visible | Deployment detail | VRC-D03 | ☐ **PENDING** |
| O-03 | Commit SHA visible | Same | VRC-D03 | ☐ **PENDING** |
| O-04 | Deployment **Ready** | Same | VRC-D03 | ☐ **PENDING** |
| O-05 | Build log / output tab open | Deployment → Building / Output | VRC-D04 | ☐ **PENDING** |
| O-06 | `api/index.mjs` or `api/` path visible in output | Same | VRC-D04 | ☐ **PENDING** |
| O-07 | Functions tab open (if available) | Deployment → Functions | VRC-D05 | ☐ **PENDING** |
| O-08 | Catch-all or `api/index` function listed | Same | VRC-D05 | ☐ **PENDING** |
| O-09 | Routes / rewrites visible (if UI shows) | Same | VRC-D05 | ☐ **PENDING** |
| O-10 | No redeploy triggered | Attestation | Manifest | ☐ **PENDING** |

---

## 3. Repo expectation (static)

| Artifact | Expected in API deploy |
|----------|------------------------|
| `api/index.mjs` | **YES** — serverless entry |
| `vercel.json` routes | `"dest": "/api/index.mjs"` |
| `POST /webhooks/stripe` handler | Inside `index.mjs` slim path |

**If O-06/O-08 fail:** H4 **more plausible** — function not in deployed output.

---

## 4. Redaction

| Item | Rule |
|------|------|
| Build env values | Do not capture |
| Database URLs in logs | Redact / skip |

---

## 5. Verdict (default)

| Item | Status |
|------|--------|
| VRC-D03 / D04 / D05 | **PENDING CAPTURE** |
| Deployed route surface verified | **NOT CONFIRMED** |
| Root cause | **NOT CONFIRMED** |

---

*Deployment output checklist · read-only · no redeploy*
