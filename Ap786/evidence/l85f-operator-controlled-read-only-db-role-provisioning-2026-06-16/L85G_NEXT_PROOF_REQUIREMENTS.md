# L-85F — L-85G next proof requirements

**L-85F does not satisfy L-85G.** Privilege proof requires connecting as `zora_walat_readonly_audit` via `READ_ONLY_DATABASE_URL`.

## Operator prerequisites for L-85G

1. Reset/set role password in **Neon console** (password not recoverable from L-85F session).
2. Build gitignored `READ_ONLY_DATABASE_URL` in `server/.env.local` — **never commit**.
3. Do not use owner `DATABASE_URL` for L-85G probe.

## L-85G VERDICT-001 bar

| Requirement | |
|-------------|---|
| Connect via `READ_ONLY_DATABASE_URL` only | Required |
| `current_user` = `zora_walat_readonly_audit` | Required |
| SELECT true on all scope tables | Required |
| INSERT/UPDATE/DELETE false on all scope tables | Required |
| No DML/DDL in gate | Required |
| No secret in evidence | Required |

## Still not claimable after L-85G alone

- Staging `DATABASE_URL` identity match (L-85C track)
- Staging DB zero-write (requires identity + bounded SELECT counts)

---

*End.*
