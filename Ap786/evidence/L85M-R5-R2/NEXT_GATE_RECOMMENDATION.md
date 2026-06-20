# L-85M-R5-R2 — Next gate recommendation

**Gate UTC:** 2026-06-20

---

## Blocker after R5-R2

**`SOURCE_CONTRACT_MATCHES_R5_R1_BUT_AUTH_REJECTED`** — source contract aligned; staging runtime auth still rejects presented token.

## Recommended next gates (separate authorization each)

| Gate | Purpose | Preconditions |
|------|---------|---------------|
| **L-85M-R5-R2M** | Staging env **metadata-only** check — `OPS_HEALTH_TOKEN` / alias **presence and length ≥16**; `READ_ONLY_DATABASE_URL` **presence** (no values printed) | Authorized Vercel read-only metadata access |
| **L-85M-R5-R2T** | Staging-only `OPS_HEALTH_TOKEN` rotation / reprovision | Explicit rotation authorization; no secret in evidence |
| **L-85M-R5-R3** | Authenticated readonly DB identity proof retry | Token/env alignment confirmed out-of-band |

## Priority order

1. **R5-R2M** — distinguish `RUNTIME_ENV_MISSING_OR_MISMATCH_LIKELY` vs `TOKEN_VALUE_MISMATCH_LIKELY`
2. **R5-R2T** — only if metadata shows missing/short/unknown staging token
3. **R5-R3** — authenticated proof retry after alignment

## Unchanged

| Item | Status |
|------|--------|
| PR #5 | **KEEP_OPEN_BLOCKED** |
| L-85M structural (R4) | **PASS** |
| L-85M overall | **NOT PASS** |

---

*End.*
