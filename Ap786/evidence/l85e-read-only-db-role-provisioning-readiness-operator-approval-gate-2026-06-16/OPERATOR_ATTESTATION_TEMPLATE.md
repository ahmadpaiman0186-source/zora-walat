# L-85E — Operator attestation template

**Use:** Future operator sessions only. **Do not** include secrets, passwords, or full `DATABASE_URL` values.

---

## Template A — L-85F provisioning authorization (future)

```
ATTESTATION_TYPE: L85F_READ_ONLY_DB_ROLE_PROVISIONING_AUTHORIZATION
DATE_UTC: YYYY-MM-DD
OPERATOR: (handle or name — no email password)
APPROVAL_PHRASE_RECEIVED: YES / NO
TARGET: Neon read-only login role for SELECT-only audit gates
ENV_VAR_NAME: READ_ONLY_DATABASE_URL
SCOPE_TABLES: PaymentCheckout, StripeWebhookEvent, AuditLog, FulfillmentAttempt, CanonicalTransaction, LedgerJournalEntry
OWNER_DATABASE_URL_MODIFIED: NO
VERCEL_DATABASE_URL_MODIFIED: NO
VERCEL_ENV_PULL_EXECUTED: NO
FULL_CONNECTION_STRING_IN_EVIDENCE: NO
PASSWORD_EXPOSED: NO
PROVISIONING_EXECUTED: YES / NO
ROLLBACK_OWNER_IDENTIFIED: YES / NO
```

## Template B — L-85G privilege proof attestation (future, post-L-85F)

```
ATTESTATION_TYPE: L85G_READ_ONLY_ROLE_PRIVILEGE_REPROBE
DATE_UTC: YYYY-MM-DD
CONNECT_VAR: READ_ONLY_DATABASE_URL
CURRENT_USER_REDACTED: (role name only, e.g. zora_audit_ro)
CURRENT_DATABASE_REDACTED: (database name only)
SELECT_ON_ALL_SCOPE_TABLES: true / false
INSERT_ON_ALL_SCOPE_TABLES: false / true
UPDATE_ON_ALL_SCOPE_TABLES: false / true
DELETE_ON_ALL_SCOPE_TABLES: false / true
DB_MUTATION_EXECUTED: NO
SECRET_EXPOSURE: NO
```

## Template C — Staging DATABASE_URL identity (separate track — not L-85E)

Use [L-85C operator attestation](../l85c-operator-redacted-vercel-staging-database-url-identity-attestation-2026-06-15/OPERATOR_VERCEL_DASHBOARD_ATTESTATION.md) pattern. Host/database/port only — no password.

---

*End.*
