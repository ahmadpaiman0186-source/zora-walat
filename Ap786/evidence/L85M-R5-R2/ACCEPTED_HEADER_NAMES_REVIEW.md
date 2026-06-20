# L-85M-R5-R2 — Accepted header names review

**Gate UTC:** 2026-06-20  
**Source:** tracked source only

---

## Pre-bootstrap guard (`prebootstrapDbReadonlyProofGuard.mjs`)

| Header (Node `req.headers` key) | Accepted shape | Notes |
|---------------------------------|----------------|-------|
| `authorization` | `Bearer <token>` | `startsWith('Bearer ')`; token = slice after prefix, trimmed |
| `x-zw-ops-token` | raw token string | trimmed; case-insensitive header key in Node |

## Express infra gate (`opsInfraHealthGate.js`)

| Header | Accepted shape |
|--------|----------------|
| `authorization` | `Bearer <token>` |
| `x-zw-ops-token` | raw token string |

## Express service duplicate check (`dbReadonlyProofService.js`)

Same two headers as above in `requestPresentsOpsToken` / `opsInfraHealthTokenMatches`.

## Not accepted in tracked source

| Header | Status |
|--------|--------|
| `x-ops-health-token` | **NOT USED** |
| `X-Ops-Health-Token` | **NOT USED** (unless normalized to unused key) |
| Cookie-based token | **NOT USED** |
| Query-string token | **NOT USED** |

## R5-R1 comparison

| R5-R1 variant | Matches tracked source |
|--------------|------------------------|
| `Authorization: Bearer` | **YES** |
| `X-ZW-Ops-Token` | **YES** (maps to `x-zw-ops-token`) |

**Conclusion:** **`HEADER_CONTRACT_MISMATCH_LIKELY` — RULED OUT** for R5-R1 rejection based on tracked source review.

---

*End.*
