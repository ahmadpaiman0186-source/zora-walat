# L-85D — Dedicated read-only DB role proof

**Date:** 2026-06-15  
**Branch:** `main` @ `96e7e96`  
**Phase:** SELECT-only privilege boundary verification — **NO DB WRITE**  
**Verdict:** `CORE10-L85D-VERDICT-002: DEDICATED_READ_ONLY_DB_ROLE_PROOF_PARTIAL_OR_UNAVAILABLE_WRITE_CAPABLE_OR_UNVERIFIED_NO_POST_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

---

## Summary

**L-85D** determines whether a dedicated least-privilege read-only DB role exists and is usable for SELECT-only verification gates.

| Layer | Finding |
|-------|--------|
| **L-85C merge** | `13f262f` ancestor of HEAD **`96e7e96`** |
| **`READ_ONLY_DB_CONNECTION_AVAILABLE`** | **NO** — no dedicated read-only env var present |
| **Connection probed** | `DATABASE_URL` only |
| **Connected role** | **`neondb_owner`** — write-capable on all probed tables |
| **INSERT/UPDATE/DELETE on scope tables** | **ALL TRUE** (privilege metadata) |
| **DB mutations executed** | **NONE** |
| **Secret exposure** | **NONE** |

VERDICT-001 requirements **not met**. Read-only DB role and least-privilege audit posture remain **NOT CLAIMED**.

## Evidence package

[Ap786/evidence/l85d-dedicated-read-only-db-role-proof-2026-06-15/](./evidence/l85d-dedicated-read-only-db-role-proof-2026-06-15/)

**Commit/push:** **NOT EXECUTED** — pending operator approval per stop condition.

---

*End.*
