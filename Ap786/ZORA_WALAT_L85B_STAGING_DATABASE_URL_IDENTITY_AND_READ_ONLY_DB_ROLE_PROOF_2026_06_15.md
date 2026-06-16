# L-85B — Staging DATABASE_URL identity + read-only DB role proof

**Date:** 2026-06-15  
**Branch:** `main` @ `b171643`  
**Phase:** Operator identity attestation boundary + SELECT-only privilege proof — **NO POST**  
**Verdict:** `CORE10-L85B-VERDICT-002: STAGING_DATABASE_URL_IDENTITY_OR_READ_ONLY_DB_ROLE_PROOF_PARTIAL_NO_POST_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

---

## Summary

**L-85B** closes the **process** gap left by L-85A: document whether Vercel staging `DATABASE_URL` matches the L-85A queried Neon endpoint and whether a read-only DB role exists.

| Layer | Finding |
|-------|--------|
| **L-85A merge** | `3f165d6` ancestor of HEAD **`b171643`** |
| **Vercel staging project** | **`zora-walat-api-staging`** — `DATABASE_URL` present, **Production** scope, value **Encrypted** (CLI) |
| **Redacted identity match** | **NOT PROVEN** — operator dashboard hostname/database comparison not recorded |
| **Read-only role** | **`READ_ONLY_ROLE_NOT_PROVEN`** — `neondb_owner` has SELECT+INSERT+UPDATE+DELETE on all probed tables |
| **Secret exposure** | **NONE** — no `env pull`, no URL/password print |

Partial attestation confirms staging binds a database URL; it does **not** prove equivalence to L-85A endpoint or least-privilege audit posture.

## Evidence package

[Ap786/evidence/l85b-staging-database-url-identity-read-only-db-role-proof-2026-06-15/](./evidence/l85b-staging-database-url-identity-read-only-db-role-proof-2026-06-15/)

**Commit/push:** **NOT EXECUTED** — pending operator approval per stop condition.

---

*End.*
