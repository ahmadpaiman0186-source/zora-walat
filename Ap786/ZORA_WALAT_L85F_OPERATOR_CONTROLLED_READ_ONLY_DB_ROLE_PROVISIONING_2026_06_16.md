# L-85F — Operator-controlled read-only DB role provisioning

**Date:** 2026-06-16  
**Branch:** `evidence/l85f-operator-controlled-read-only-db-role-provisioning-2026-06-16`  
**Base:** `c86f46f` — main (L-85E PR #264 merged)  
**Phase:** Approved DB metadata mutation only — **NO table data mutation** · **NO runtime/payment/provider**  
**Verdict:** `CORE10-L85F-VERDICT-001: OPERATOR_CONTROLLED_READ_ONLY_DB_ROLE_PROVISIONED_METADATA_MUTATION_ONLY_NO_TABLE_DATA_MUTATION_NO_POST_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

---

## Summary

**L-85F** provisions dedicated read-only role **`zora_walat_readonly_audit`** on Neon database **`neondb`** with SELECT-only grants on six scoped audit/checkout tables.

| Layer | Finding |
|-------|--------|
| **Operator approval** | L-85F phrase received |
| **Role created** | **YES** (this run) |
| **SELECT on scope tables** | **YES** |
| **INSERT/UPDATE/DELETE on scope tables** | **NO** (verified via `has_table_privilege` post-grant) |
| **Table data mutation** | **NO** |
| **Secret printed** | **NO** |
| **L-85G privilege proof** | **NOT CLAIMED** — operator must set password + `READ_ONLY_DATABASE_URL` |

## Evidence package

[Ap786/evidence/l85f-operator-controlled-read-only-db-role-provisioning-2026-06-16/](./evidence/l85f-operator-controlled-read-only-db-role-provisioning-2026-06-16/)

**Commit/push:** commit on branch; **push NOT EXECUTED** per stop condition.

---

*End.*
