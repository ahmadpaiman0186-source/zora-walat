# L-76 — Command risk classification

**Date:** 2026-06-07

---

| # | Command | Classification | Wired-path NPNS/idempotency? | L-76 eligible? |
|---|---------|----------------|------------------------------|----------------|
| A | `test:no-pay-no-service` | **SAFE_READONLY** | **NO** (unit fixtures) | **NO** — L-75 scope |
| B | `test:idempotency-kernel` | **SAFE_READONLY** | **NO** (unit fixtures) | **NO** — L-75 scope |
| C | `test:safe-repair-dry-run` | **SAFE_READONLY** | **NO** (unit fixtures) | **NO** |
| D | `zw:doctor repair-dry-run --fixture …` | **SAFE_DRY_RUN** | **NO** (JSON fixture; CORE-08) | **NO** — not wired |
| E | `zw:doctor reliability --fixture …` | **SAFE_DRY_RUN** | **NO** (JSON snapshot; CORE-04) | **NO** — not wired |
| F | `zw:doctor webhook` (default probes) | **UNKNOWN_RISK** / **NETWORK_PROVIDER_RISK** if staging probed | **NO** (no CORE-05/06 invoke) | **NO** |
| F′ | `zw:doctor webhook --ci-static` | **SAFE_READONLY** (local static) | **NO** | **NO** — no invariant dry-run |
| G | `verify:wallet-topup-idempotency` | **DB_MUTATION_RISK** | **YES** (integration) | **FORBIDDEN** |
| H | `proof:stripe-webhook-local` | **DB_MUTATION_RISK** | **YES** (webhook+DB) | **FORBIDDEN** |
| I | `proof:reloadly-dry-run` | **NETWORK_PROVIDER_RISK** | **NO** | **FORBIDDEN** |
| J | `test:integration` | **DB_MUTATION_RISK** | **PARTIAL** (various) | **FORBIDDEN** |
| K | `preflight:production` | **NETWORK_PROVIDER_RISK** | **NO** | **FORBIDDEN** |

---

## Static wiring conclusion

| Invariant module | Live route/webhook import | Wired dry-run CLI |
|------------------|---------------------------|-------------------|
| CORE-05 idempotencyKernel | **NOT WIRED** | **NONE** |
| CORE-06 noPayNoServiceProof | **NOT WIRED** | **NONE** |

---

## L-76 classification verdict

**No command classified as SAFE_READONLY or SAFE_DRY_RUN that also exercises wired/staging-like NPNS + idempotency enforcement.**

**Overall:** **BLOCKED — eligibility not met**

---

*End of risk classification.*
