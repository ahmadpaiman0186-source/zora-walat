# L-85F — Provisioning runbook executed

**Execution UTC:** 2026-06-16  
**Result:** `PROVISION_OK=YES`

## Pre-execution plan

See [PROVISIONING_PLAN_PRE_EXECUTION.md](./PROVISIONING_PLAN_PRE_EXECUTION.md).

## Execution summary

| Field | Value |
|-------|-------|
| Role name | `zora_walat_readonly_audit` |
| Role created this run | **YES** |
| Role pre-existed | **NO** |
| Target host (redacted) | `ep-wild-wind-appeopzn-pooler.c-7.us-east-1.aws.neon.tech` |
| Target database | `neondb` |
| Owner session | bootstrap `DATABASE_URL` (not printed) |
| Password source | `generated_in_process_not_printed` — `ZORA_L85F_READONLY_ROLE_PASSWORD` was **absent** |
| Password printed | **NO** |
| Ephemeral script | deleted after execution |

## Metadata mutations performed

| Action | Status |
|--------|--------|
| `CREATE ROLE zora_walat_readonly_audit` | **YES** |
| `GRANT CONNECT ON DATABASE neondb` | **YES** |
| `GRANT USAGE ON SCHEMA public` | **YES** |
| `GRANT SELECT` on 6 scoped tables | **YES** |

## Role attributes (from `pg_roles`)

| Attribute | Value |
|-----------|-------|
| `rolsuper` | false |
| `rolcreatedb` | false |
| `rolcreaterole` | false |
| `rolreplication` | false |
| `rolcanlogin` | true |

## Operator follow-up (required for L-85G)

Password was generated in-process and **not stored**. Operator must **reset password in Neon console**, store in password manager, and set gitignored `READ_ONLY_DATABASE_URL` locally before L-85G — **outside chat/repo**.

---

*End.*
