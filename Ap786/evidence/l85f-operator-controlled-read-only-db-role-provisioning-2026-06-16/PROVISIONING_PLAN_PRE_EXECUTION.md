# L-85F — Planned DB metadata mutations (pre-execution)

**Role name:** `zora_walat_readonly_audit`  
**Target database:** `neondb` (redacted host per L-85A/L-85D — Neon pooler)  
**Schema:** `public`  
**Execution connection:** owner session via bootstrap `DATABASE_URL` — **value not printed**

**Password in plan:** **NOT INCLUDED** — supplied at runtime via operator env `ZORA_L85F_READONLY_ROLE_PASSWORD` or generated in-process without output.

---

## Planned SQL (metadata only — no table data mutation)

```sql
-- 1) Idempotent role create (skip if exists)
CREATE ROLE zora_walat_readonly_audit WITH
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  PASSWORD '<REDACTED — not in evidence>';

-- 2) Database / schema access
GRANT CONNECT ON DATABASE neondb TO zora_walat_readonly_audit;
GRANT USAGE ON SCHEMA public TO zora_walat_readonly_audit;

-- 3) SELECT only on scoped tables
GRANT SELECT ON TABLE "PaymentCheckout" TO zora_walat_readonly_audit;
GRANT SELECT ON TABLE "StripeWebhookEvent" TO zora_walat_readonly_audit;
GRANT SELECT ON TABLE "AuditLog" TO zora_walat_readonly_audit;
GRANT SELECT ON TABLE "FulfillmentAttempt" TO zora_walat_readonly_audit;
GRANT SELECT ON TABLE "CanonicalTransaction" TO zora_walat_readonly_audit;
GRANT SELECT ON TABLE "LedgerJournalEntry" TO zora_walat_readonly_audit;
```

## Post-grant verification (metadata SELECT only — owner session)

```sql
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication
FROM pg_roles WHERE rolname = 'zora_walat_readonly_audit';

SELECT
  has_table_privilege('zora_walat_readonly_audit', '"PaymentCheckout"', 'SELECT') AS pc_sel,
  has_table_privilege('zora_walat_readonly_audit', '"PaymentCheckout"', 'INSERT') AS pc_ins,
  ... -- each scoped table SELECT/INSERT/UPDATE/DELETE
```

## Explicitly excluded from plan

- INSERT / UPDATE / DELETE on table **data**
- TRUNCATE / DROP / ALTER TABLE
- CREATE on schema (except role DDL)
- Vercel env update / redeploy / application config change

---

*End — plan section; execution results appended after run.*
