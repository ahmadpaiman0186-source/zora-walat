# L-85J — Read-only runtime proof design gate

**Gate UTC:** 2026-06-16  
**Baseline:** `main` @ PR #268 merge (L-85I)  
**Verdict:** `L-85J_READ_ONLY_RUNTIME_PROOF_DESIGN_FILED_LOCAL_ONLY__NO_RUNTIME_PROOF_NO_GLOBAL_MONEY_PROVIDER_MARKET_CLAIMS`

## Purpose

Evidence-only **design** for a future safe runtime read-only DB identity and no-write-permission proof path. Builds on [L-85I findings](../L85I/RUNTIME_TARGET_INVENTORY.md):

- `READ_ONLY_DATABASE_URL` is not consumed by tracked runtime code.
- No safe runtime DB identity proof endpoint exists.
- Existing `/health`, `/ready`, and `/ops/health` do not prove read-only role identity or no-write privileges.
- Runtime DB paths use owner `DATABASE_URL` through Prisma.
- Future Vercel target for `READ_ONLY_DATABASE_URL` is **`zora-walat-api-staging`** — **INFERRED**.

**This gate is NOT runtime proof, global proof, real-money proof, provider proof, or market proof.**

## Contents

| File | Purpose |
|------|---------|
| [READ_ONLY_RUNTIME_PROOF_DESIGN.md](./READ_ONLY_RUNTIME_PROOF_DESIGN.md) | End-to-end future proof path design |
| [SAFE_SQL_SPEC.md](./SAFE_SQL_SPEC.md) | Allowed and forbidden SQL for future implementation |
| [ENDPOINT_CONTRACT.md](./ENDPOINT_CONTRACT.md) | Future `GET /ops/db-readonly-proof` response contract |
| [SECURITY_AND_AUTHORIZATION_GATE.md](./SECURITY_AND_AUTHORIZATION_GATE.md) | Pre-mutation authorization requirements |
| [IMPLEMENTATION_BLOCKERS.md](./IMPLEMENTATION_BLOCKERS.md) | Current blockers and future evidence requirements |
| [NON_CLAIMS.md](./NON_CLAIMS.md) | Explicit non-claims for L-85J |

## Headline design summary

| Item | Design decision |
|------|-----------------|
| Future endpoint (candidate) | `GET /ops/db-readonly-proof` |
| Auth | `OPS_HEALTH_TOKEN` — fail closed on missing/invalid |
| DB connection | `READ_ONLY_DATABASE_URL` only — separate client, no owner fallback |
| Response | Boolean/structural flags + verdict `PASS` / `BLOCKED` / `FAIL` only |
| Implementation in L-85J | **NO** |

## Related gates

- [L-85I runtime target inventory](../L85I/README.md)
- [L-85G local read-only role proof](../L85G/EXECUTION_REPORT.md) — CLI/ephemeral only; does not satisfy runtime proof

---

*End.*
