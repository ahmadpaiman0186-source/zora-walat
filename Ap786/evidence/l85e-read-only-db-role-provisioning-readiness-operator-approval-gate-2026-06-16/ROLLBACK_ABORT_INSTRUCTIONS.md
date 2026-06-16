# L-85E — Rollback / abort instructions

---

## Abort before L-85F execution

Stop immediately if:

- Approval phrase for L-85F not received
- Operator cannot identify correct Neon branch
- Any requirement to paste full `DATABASE_URL` into chat or evidence
- Accidental secret exposure in terminal or Ap786 draft

**Action:** Do not create role. File abort attestation only (no secrets).

---

## Abort during L-85F provisioning

If role creation or GRANT fails mid-session:

1. **Do not** retry with owner credentials from agent automation
2. Operator reviews partial role in Neon console
3. If orphan role created: `DROP ROLE` only with explicit operator approval and separate gate
4. File L-85F **BLOCKED** or **PARTIAL** evidence — no success claims

---

## Rollback after L-85F (operator-only)

| Step | Action |
|------|--------|
| 1 | Revoke SELECT on scope tables from `zora_audit_ro` (or created role) |
| 2 | `DROP ROLE` if role should be removed |
| 3 | Remove `READ_ONLY_DATABASE_URL` from local `.env.local` |
| 4 | If added to Vercel (only if separately approved): remove env var via dashboard |
| 5 | File rollback attestation — role name only, no passwords |

**No rollback required for L-85E** — documentation only; no infrastructure change.

---

## L-85E session abort

If agent begins DB connection, env pull, or provisioning during L-85E:

- **VERDICT-003** boundary — stop; do not commit evidence claiming VERDICT-001
- Review [FORBIDDEN_ACTIONS.md](./FORBIDDEN_ACTIONS.md)

---

*End.*
