# L-85M-R5-R2 — Failure mode matrix

**Gate UTC:** 2026-06-20

---

## Primary classification

**`SOURCE_CONTRACT_MATCHES_R5_R1_BUT_AUTH_REJECTED`**

Tracked auth contract and R5-R1 header usage align. Auth still returned **401** on both variants → failure is downstream of contract (runtime env/token), not wrong header name in client.

---

## Matrix

| Failure mode | Likelihood | Ruled in / out | Rationale |
|--------------|------------|----------------|-----------|
| **`TOKEN_VALUE_MISMATCH_LIKELY`** | **HIGH** | Open | Guard step 3: presented token ≠ staging configured token → **401** `token_invalid`. Operator had local Process token; staging Vercel value not verified. |
| **`RUNTIME_ENV_MISSING_OR_MISMATCH_LIKELY`** | **HIGH** | Open | Guard step 1: staging `OPS_HEALTH_TOKEN` / alias **< 16** or empty → **401** `token_invalid` **before** comparison. Explains both variants failing identically. |
| **`HEADER_CONTRACT_MISMATCH_LIKELY`** | **RULED OUT** | Out | R5-R1 used exact tracked headers; source accepts both. |
| **`BRIDGE_HEADER_FORWARDING_ISSUE_LIKELY`** | **LOW** | Unlikely | Bridge code does not strip headers; R4 unauth reached `token_missing`. R5-R1 `reason` not filed — cannot confirm. |
| **`DEPLOYMENT_STALENESS_LIKELY`** | **LOW** | Unlikely | R4 structural + R5-R1 `X-Matched-Path` show current bridge/guard deployed. |
| **`SOURCE_CONTRACT_MATCHES_R5_R1_BUT_AUTH_REJECTED`** | **CONFIRMED** | In | Result of this read-only investigation. |
| **`INCONCLUSIVE_NEEDS_STAGING_ENV_ROTATION_OR_OPERATOR_METADATA`** | **APPLIES** | Partial | Cannot separate HIGH hypotheses without staging env metadata (presence/length) or authorized rotation gate. |

---

## HTTP status constraint (R5-R1)

| Status | Rules out |
|--------|-----------|
| **401** | `readonly_url_missing` path (**503** in source) |
| **401** with token sent | Does **not** alone distinguish `token_missing` vs `token_invalid` without response `reason` |

---

## Recommended next investigative split

| If staging metadata shows… | Next action |
|-----------------------------|-------------|
| `OPS_HEALTH_TOKEN` missing or <16 | **L-85M-R5-R2T** staging env provisioning / rotation (authorized) |
| `OPS_HEALTH_TOKEN` present and ≥16 | Reconcile operator local token with staging (out-of-band); retry authenticated proof |
| `READ_ONLY_DATABASE_URL` missing | Separate readonly URL provisioning gate (would block at **503** after auth) |

---

*End.*
