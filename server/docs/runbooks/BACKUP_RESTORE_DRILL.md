# Backup, restore, and ledger-safe validation drill

**Audience:** Operators, SRE, principal engineers.  
**Scope:** Managed PostgreSQL (authoritative money path), optional Redis/BullMQ context.  
**Hard rule:** Never **`UPDATE`** or **`DELETE`** rows on **`LedgerJournalEntry`** or **`LedgerJournalLine`** in production or staging “to fix” a restore — DB triggers enforce immutability; audit relies on append-only journal semantics.

This runbook is **documentation only**. Commands below use placeholders; fill them using **your** cloud provider’s CLI or console (RDS, Cloud SQL, Neon, Azure Postgres, etc.). Do **not** paste secrets, connection strings, or dump paths into git.

---

## 1. Policy targets (operator-defined)

Record actual numbers after your first rehearsal:

| Metric | Meaning | Example placeholder |
|--------|---------|---------------------|
| **RPO** | Maximum acceptable data loss window | Bounded by backup frequency or replica lag |
| **RTO** | Time to restored DB + app smoke | Wall-clock from decision → `/ready` healthy |

See also conceptual framing in **`docs/L24_MULTI_REGION_FAILOVER.md`** (Postgres promote vs cold restore).

---

## 2. What must be backed up

| Asset | Notes |
|-------|--------|
| **PostgreSQL** | Source of truth: `PaymentCheckout`, `FulfillmentAttempt`, **`LedgerJournalEntry` / `LedgerJournalLine`** (immutable), `StripeWebhookEvent`, etc. |
| **Redis** | Queue state / rate-limit keys — treat as **ephemeral** unless your infra mandates persistence. After DB restore, reconcile **DB `QUEUED` rows** vs BullMQ depth (see §7). |
| **Secrets** | Never inside DB dumps for ops discipline; restore procedures assume vault/host env unchanged or rotated per **`docs/SECRETS_MANAGEMENT.md`**. |

---

## 3. Where to run the first proof

| Environment | Allowed for initial drill |
|-------------|-------------------------|
| **Dedicated staging Postgres** | **Yes** — synthetic or disposable data only |
| **CI ephemeral Postgres** | Useful for app/tests; **not** a substitute for managed-provider snapshot/restore proof |
| **Production** | **No** for rehearsal without explicit change approval |

Use **`AIRTIME_PROVIDER=mock`**, **Stripe test mode**, and **no live Reloadly** when generating synthetic rows before backup.

---

## 4. Pre-backup: synthetic money-path rows (optional)

To validate ledger-linked FKs after restore, create **non-production** rows using existing safe proofs (against staging DB only):

- `npm --prefix server run proof:stripe-webhook-local`
- `npm --prefix server run proof:reloadly-dry-run`

These scripts intentionally **do not delete** immutable ledger-linked subgraphs; leftover rows are acceptable on disposable DBs.

---

## 5. Backup (provider-native — outline)

1. Confirm **automated backups** are enabled in managed Postgres (retention window documented).  
2. Take a **manual snapshot** or **logical dump** immediately before a risky migration if policy requires.  
3. Store backup metadata: **timestamp**, **region**, **instance id** (redacted in evidence packs).

Do **not** commit dumps or `.sql` files containing real data to the repo.

---

## 6. Restore drill (to a **new** database or instance)

1. **Restore** using provider workflow to a **new** endpoint (avoid overwriting the active staging primary until validated).  
2. Set **`DATABASE_URL`** (or staging secret) to the **restored** database — via vault/host UI only.  
3. Apply migrations forward from restored snapshot:

   ```bash
   npm --prefix server run db:migrate
   ```

   Resolve any **drift** between snapshot schema and application revision per your incident process — never assume `_prisma_migrations` matches without checking.

4. **Schema parity:** `npx prisma validate` from `server/`.

---

## 7. Post-restore validation (read-only + approved scripts)

**Ledger:** Use **`SELECT`** / reconciliation outputs only.

Suggested commands (staging, secrets redacted in logs):

```bash
npm --prefix server run db:validate
npm --prefix server run reconciliation:scan
npm --prefix server run canonical:reconcile-scan
```

Optional API smoke (staging URL, test credentials):

- `GET /health`
- `GET /ready` (respect **`OPS_HEALTH_TOKEN`** rules)

**Redis / queue:** After pointing workers at restored DB, compare fulfillment **`QUEUED`** counts in Postgres vs BullMQ; re-enqueue or drain per **`docs/PHASE1_INCIDENT_PLAYBOOK.md`** / admin tooling — **not** by deleting ledger rows.

---

## 8. Application rollback vs database rollback

| Scenario | Preferred action |
|----------|------------------|
| Bad deploy | Redeploy previous image; **same** migration direction — see **`docs/PHASE1_LAUNCH_ROLLBACK_NOTES.md`** |
| Bad migration | **Forward-fix migration** after snapshot; avoid schema rewind unless executive-approved |
| Active incident | **`PRELAUNCH_LOCKDOWN`** / **`PAYMENTS_LOCKDOWN_MODE`** per **`docs/DEPLOYMENT_READINESS.md`** §12 |

---

## 9. Evidence pack (redacted)

Store outside git (ticket / secure drive). Minimum:

1. Screenshot or export: backup policy / retention (values redacted).  
2. Restore job completion (job id + timestamp, no secrets).  
3. Output summary from **`reconciliation:scan`** / **`canonical:reconcile-scan`** (counts only).  
4. **`/health`** and **`/ready`** status after restore.  
5. Attestation: **no `UPDATE`/`DELETE` executed on ledger journal tables** during the drill.

Use **`ZORA_WALAT_EXTERNAL_READINESS_AUDIT_2026-05-06.md`** §5 (managed PostgreSQL) and §11 (operator checklist) when promoting evidence to external readiness review — **do not** mark external readiness **VERIFIED** until those rows are satisfied.

---

## Related documents

- **`docs/L25_BACKUP_RESTORE_READINESS.md`** — L25 gate scope and PASS criteria  
- **`docs/L24_MULTI_REGION_FAILOVER.md`** — RPO/RTO narrative, Redis queue caveat  
- **`docs/DEPLOYMENT_READINESS.md`** — rollback §12  
- **`docs/PHASE1_LAUNCH_ROLLBACK_NOTES.md`** — app rollback  
- **`docs/PHASE1_INCIDENT_PLAYBOOK.md`** — post-restore triage patterns  
- **`docs/SECRETS_MANAGEMENT.md`** — rotation during DR  
