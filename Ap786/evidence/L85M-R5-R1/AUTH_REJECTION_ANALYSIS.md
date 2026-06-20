# L-85M-R5-R1 — Auth rejection analysis

**Gate UTC:** 2026-06-20  
**Classification:** **`L-85M-R5-R1_AUTH_REJECTED_NOT_PASS`**

---

## Summary

Authenticated read-only DB identity proof **failed at the auth gate**. The operator executed retry in a PowerShell session with Process-scoped `$env:OPS_HEALTH_TOKEN` set. Both tracked auth contract variants returned **HTTP 401 Unauthorized**. The route remained structurally exposed (`X-Matched-Path: /api/ops/db-readonly-proof`), but **no authenticated proof was accepted** and **no runtime DB identity was established**.

## Observed safe outcomes

| Check | Result |
|-------|--------|
| Route mapping | **STRUCTURALLY CORRECT** |
| Bearer variant | **401** — rejected |
| `X-ZW-Ops-Token` variant | **401** — rejected |
| Runtime DB user proven | **NO** |
| Runtime DB query proven | **NO** |
| L-85M PASS | **NOT CLAIMED** |

## Interpretation (non-speculative)

| Finding | Meaning |
|---------|---------|
| **401 on both variants** | Supplied Process token did **not** satisfy pre-bootstrap / ops infra auth for this deployment |
| **`X-Matched-Path` present** | Rewrite bridge and handler routing remain active — rejection is **not** a 404 routing miss |
| **No body fields filed** | Evidence stores allowlisted metadata only; rejection conclusion is from **HTTP 401 on both contract variants**, not from a PASS JSON body |

## Distinction from prior R5-R1 inconclusive

| Prior state | Current state |
|-------------|---------------|
| `R5_R1_BLOCKED_TOKEN_NOT_AVAILABLE` in agent subprocess | Operator session retry **executed** |
| Authenticated GET **NOT EXECUTED** | Authenticated GET **EXECUTED** — **AUTH REJECTED** |

## Not concluded in this gate

- Whether local `$env:OPS_HEALTH_TOKEN` mismatches staging Vercel `OPS_HEALTH_TOKEN`
- Whether staging env var is missing, truncated, or rotated
- Whether token was sent on the wrong variant only (both variants were tried and both rejected)

These require a **separate authorized env-alignment or R5-R2 gate** — not claimed here.

---

*End.*
