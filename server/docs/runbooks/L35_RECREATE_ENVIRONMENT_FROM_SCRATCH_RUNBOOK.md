# L35 — Recreate environment from scratch (tabletop / plan-only)

**Use:** Disaster or greenfield **rebuild** of **staging** (default). **Production** recreation requires **executive + finance** approval and L25 alignment.

**Hard NO-GO:** Running this sequence against **production** without explicit approval and incident commander.

---

## Safe environment

- **Staging** or **new isolated Neon project** for rehearsal.
- **Forbidden:** Destroying production Neon or production Vercel project as a “test.”

---

## Source repos / branches

- Application: `zora_walat` git remote — release tag or approved branch **names only**

---

## Tabletop sequence (ordered)

1. **Declare** scope: staging-only vs prod rebuild (if prod — stop; open executive ticket).
2. **Vercel:** Create **new** project **or** unlink/relink per [`../infrastructure/L35_PROVISIONING_RUNBOOK_DRY_RUN.md`](../infrastructure/L35_PROVISIONING_RUNBOOK_DRY_RUN.md).
3. **Env var names:** inject full set from [`../infrastructure/L35_SECRET_AND_CONFIG_OWNERSHIP_MATRIX.md`](../infrastructure/L35_SECRET_AND_CONFIG_OWNERSHIP_MATRIX.md) — **vault → Vercel**, never git.
4. **Database:** New Neon branch **or** restore from backup (L25) — decision recorded.
5. **Prisma:** `migrate deploy` on new `DATABASE_URL`.
6. **Stripe:** New **test** webhook endpoint for staging; live endpoint only for prod rebuild with dual control.
7. **Reloadly:** Sandbox app for staging; verify `RELOADLY_SANDBOX`.
8. **Redis:** New instance; new `REDIS_URL`.
9. **DNS:** Staging subdomain only; **no** apex flip in tabletop unless scheduled change.
10. **Observability:** Wire log drain **names** when L29 ready.
11. **Support/security:** Notify if staging is customer-visible (rare).
12. **Readiness:** `/health` + token `/ready`.
13. **Evidence:** Inventory row + redacted screenshots.

---

## Rollback / abort

- Keep previous Vercel deployment **promoted** until new env **PASS**
- Abort if migration fails — **do not** hand-edit prod ledger

---

## Final verification

- [ ] Inventory status `PASS`
- [ ] `secrets:scan` green on release branch
- [ ] Soft launch / L32 checklist ack when that package exists

---

## References

- [`../infrastructure/L35_ENVIRONMENT_INVENTORY_SCHEMA.md`](../infrastructure/L35_ENVIRONMENT_INVENTORY_SCHEMA.md), [`BACKUP_RESTORE_DRILL.md`](./BACKUP_RESTORE_DRILL.md)
