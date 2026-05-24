# STR-02 — Vercel Project Root Evidence Checklist

**Date:** 2026-05-24
**Parent:** [Vercel read-only diagnostics](./ZORA_WALAT_STR02_VERCEL_READONLY_ROUTING_DIAGNOSTICS_2026_05_24.md)

**Policy:** Read-only dashboard review. **Do not edit settings.**

---

## 1. Target project

| Field | Expected | Captured (2026-05-24) |
|-------|----------|------------------------|
| Project name | `zora-walat-api-staging` | **YES** (VRC-D01) |
| Host | `zora-walat-api-staging.vercel.app` | Not in D01 frame — verify VRC-D06 |
| Intended root | **`server`** (API project) | **NO** — Root Directory = **`./`** |
| Forbidden root | Repo root (Next.js) | **OBSERVED** — `./` |

---

## 2. Capture checklist

| # | Check | Vercel path | Evidence | Status |
|---|-------|-------------|----------|--------|
| R-01 | Project name visible | Settings → Build and Deployment | VRC-D01 | ☑ **CAPTURED** |
| R-02 | **Root Directory** value visible | Same | VRC-D01 | ☑ **CAPTURED** — **`./`** |
| R-03 | Root Directory = **`server`** | Same | VRC-D01 | ☐ **FAIL** — value is **`./`** |
| R-04 | If root empty/`./` → note **monorepo root risk** | Same | VRC-D01 | ☑ **RECORDED** — **H2 strengthened** |
| R-05 | Framework preset visible | Build and Deployment | VRC-D02 | ☑ **PARTIAL** — Build Settings / Framework Settings entry visible |
| R-06 | Framework **not** Next.js (if API project) | Same | VRC-D02 | ☐ **PENDING** — dedicated framework preset frame not captured |
| R-07 | Build command visible | Build & Development | VRC-D02 | ☐ **NOT IN FRAME** |
| R-08 | Output directory visible (if shown) | Same | VRC-D02 | ☐ **NOT IN FRAME** |
| R-09 | Install command visible | Same | VRC-D02 | ☐ **NOT IN FRAME** |
| R-10 | No settings changed during review | Operator attestation | Manifest §6 | ☑ **YES** |

### Supporting captures (VRC-D02A…D02D)

| # | Check | Evidence | Status |
|---|-------|----------|--------|
| R-11 | Ignored Build Step = **Automatic** | VRC-D02A | ☑ **CAPTURED** |
| R-12 | Node.js Version = **24.x** | VRC-D02A | ☑ **CAPTURED** |
| R-13 | On-demand Concurrent Builds **disabled** (one at a time) | VRC-D02B | ☑ **CAPTURED** |
| R-14 | Build Machine = **Team Default (None)** | VRC-D02C | ☑ **CAPTURED** |
| R-15 | Deployment Checks = **No checks configured** | VRC-D02C | ☑ **CAPTURED** |
| R-16 | Rolling Releases = **Disabled** | VRC-D02D | ☑ **CAPTURED** |
| R-17 | Prioritize Production Builds = **Enabled** | VRC-D02D | ☑ **CAPTURED** |

---

## 3. Expected vs risk matrix

| Root Directory | Framework (typical) | POST `/webhooks/stripe` risk |
|----------------|---------------------|------------------------------|
| **`server`** | None / Other | **Lower** — matches repo API layout |
| **Empty / `.` / `./`** | Next.js | **High** — H2/H3; 404 plausible |
| Other path | Unknown | **High** — investigate |

**Captured row:** **`./`** → **High risk** — **strengthens** monorepo-root mismatch vs intended `server/` API deploy.

---

## 4. Redaction rules

| Redact | Rule |
|--------|------|
| Team / account tokens in URL | Black bar applied to URL bar |
| Unrelated project IDs | Crop or bar |
| Env var values | **Never** screenshot values |

---

## 5. Verdict

| Item | Status |
|------|--------|
| VRC-D01 / VRC-D02 | **CAPTURED** |
| VRC-D02A…D02D | **CAPTURED** (supporting) |
| Project root = `server` | **NOT SATISFIED** — observed **`./`** |
| Monorepo root hypothesis (H2) | **STRENGTHENED / NOT CONFIRMED** |
| Root cause | **NOT CONFIRMED** |

---

*Project root checklist · D01/D02 CAPTURED · root cause NOT CONFIRMED*
