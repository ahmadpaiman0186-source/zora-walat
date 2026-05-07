# L25 — Production safety foundation (backup / restore / readiness)

**Document status:** Documentation slice **implemented** in-repo.  
**Gate status:** **NOT CLOSED** — closing requires a completed **staging restore drill** and **redacted evidence pack** per **`docs/runbooks/BACKUP_RESTORE_DRILL.md`**.

This document does **not** claim:

- staging readiness, soft launch readiness, or public launch readiness  
- **external readiness VERIFIED** (see repo-root **`ZORA_WALAT_EXTERNAL_READINESS_AUDIT_2026-05-06.md`**)  
- measured **RPO/RTO** until operators record them after rehearsal  

---

## 1. Purpose

Establish a **production-grade** backup, restore, and validation **policy** for Zora-Walat’s authoritative PostgreSQL database while preserving:

- **Ledger immutability** (`LedgerJournalEntry` / `LedgerJournalLine` — no `UPDATE`/`DELETE` in real environments for “cleanup”)  
- **Auditability** and rollback safety (forward migrations preferred; app rollback via deploy)  
- **Separation** between repo/internal engineering proof (CI) and **infra** proof (managed backups)

---

## 2. Deliverables in this slice

| Deliverable | Path |
|-------------|------|
| Operator restore drill runbook | **`docs/runbooks/BACKUP_RESTORE_DRILL.md`** |
| Runbooks index entry | **`docs/runbooks/README.md`** |
| Cross-links from launch / deployment docs | **`docs/PHASE1_LAUNCH_ROLLBACK_NOTES.md`**, **`docs/DEPLOYMENT_READINESS.md`** |
| Checkpoint tracker update | **`ZORA_WALAT_L_ROADMAP_CHECKPOINT.md`** |

---

## 3. PASS / CLOSED criteria (for L25 gate — future)

**L25 may be marked CLOSED** in **`ZORA_WALAT_L_ROADMAP_CHECKPOINT.md`** only when **all** apply:

1. Staging (or equivalent non-production) **restore from backup** completed using provider-native tooling.  
2. **`npm --prefix server run db:migrate`** (or `db:migrate` against restored DB) succeeds without undocumented manual DDL.  
3. Read-only validation: **`reconciliation:scan`** / **`canonical:reconcile-scan`** summaries captured; ledger tables **not** modified for convenience.  
4. **`/health`** + **`/ready`** smoke on API pointed at restored DB.  
5. **Redacted evidence pack** stored per **`BACKUP_RESTORE_DRILL.md`** §9.  
6. **External readiness** Postgres backup rows addressed via **`ZORA_WALAT_EXTERNAL_READINESS_AUDIT_2026-05-06.md`** process (operator evidence — this repo does not flip VERIFIED by itself).

Until then: **L25 remains IN PROGRESS**.

---

## 4. Explicit non-goals (this slice)

- No new application features or money-path logic changes  
- No live Stripe or live Reloadly  
- No automation that deletes or updates immutable ledger rows  
- No requirement to run drills against **production** without a separate approval  

---

## 5. Related canonical docs

- **`ZORA_WALAT_MASTER_HANDOFF_2026-05-06.md`** — architecture / money path  
- **`ZORA_WALAT_EXTERNAL_READINESS_AUDIT_2026-05-06.md`** — dashboard/cloud evidence (still **NOT VERIFIED** until operator completes checklists)  
