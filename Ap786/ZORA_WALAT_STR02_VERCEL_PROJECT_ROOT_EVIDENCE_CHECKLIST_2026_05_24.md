# STR-02 — Vercel Project Root Evidence Checklist

**Date:** 2026-05-24
**Parent:** [Vercel read-only diagnostics](./ZORA_WALAT_STR02_VERCEL_READONLY_ROUTING_DIAGNOSTICS_2026_05_24.md)

**Policy:** Read-only dashboard review. **Do not edit settings.**

---

## 1. Target project

| Field | Expected |
|-------|----------|
| Project name | `zora-walat-api-staging` |
| Host | `zora-walat-api-staging.vercel.app` |
| Intended root | **`server`** (API project) |
| Forbidden root | Repo root (Next.js) |

---

## 2. Capture checklist

| # | Check | Vercel path | Evidence | Status |
|---|-------|-------------|----------|--------|
| R-01 | Project name visible | Settings → General | VRC-D01 | ☐ **PENDING** |
| R-02 | **Root Directory** value visible | Settings → General | VRC-D01 | ☐ **PENDING** |
| R-03 | Root Directory = **`server`** | Same | VRC-D01 | ☐ **PENDING** |
| R-04 | If root empty → note **monorepo root risk** | Same | VRC-D01 | ☐ **PENDING** |
| R-05 | Framework preset visible | Settings → General / Build | VRC-D02 | ☐ **PENDING** |
| R-06 | Framework **not** Next.js (if API project) | Same | VRC-D02 | ☐ **PENDING** |
| R-07 | Build command visible | Build & Development | VRC-D02 | ☐ **PENDING** |
| R-08 | Output directory visible (if shown) | Same | VRC-D02 | ☐ **PENDING** |
| R-09 | Install command visible | Same | VRC-D02 | ☐ **PENDING** |
| R-10 | No settings changed during review | Operator attestation | Manifest §4 | ☐ **PENDING** |

---

## 3. Expected vs risk matrix

| Root Directory | Framework (typical) | POST `/webhooks/stripe` risk |
|----------------|---------------------|------------------------------|
| **`server`** | None / Other | **Lower** — matches repo API layout |
| **Empty / `.`** | Next.js | **High** — H2/H3; 404 plausible |
| Other path | Unknown | **High** — investigate |

---

## 4. Redaction rules

| Redact | Rule |
|--------|------|
| Team / account tokens in URL | Black bar |
| Unrelated project IDs | Crop or bar |
| Env var values | **Never** screenshot values |

---

## 5. Verdict (default)

| Item | Status |
|------|--------|
| VRC-D01 / VRC-D02 | **PENDING CAPTURE** |
| Project root confirmed | **NOT CONFIRMED** |
| Root cause | **NOT CONFIRMED** |

---

*Project root checklist · read-only · no settings edit*
