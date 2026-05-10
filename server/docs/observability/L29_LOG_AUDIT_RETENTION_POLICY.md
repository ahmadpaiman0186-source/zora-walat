# L29 — Log, audit, and evidence retention policy

**Status:** Operational policy draft. **Pending** legal/compliance review before enforcement.

---

## Retention targets (defaults — adjust per jurisdiction)

| Data class | Retention | Notes |
|------------|-----------|--------|
| **Application logs** (stdout/stderr, Vercel) | **30 days** hot; **90 days** archive if vendor supports | JSON structured; no card numbers |
| **Security logs** (auth failures, rate limits, invalid webhook sig) | **90 days** minimum | May extend for investigations |
| **Audit logs** (`OrderAudit`, admin actions) | **7 years** business record placeholder | Align with finance policy; DB retention ≠ log vendor |
| **Payment / ledger / reconciliation evidence** | **7 years** placeholder | Source of truth in DB; exports for disputes |
| **Stripe webhook event IDs** (DB `StripeWebhookEvent`) | Lifetime of DB backup policy | Correlates to Stripe Dashboard |
| **Incident records** (tickets, postmortems) | **2 years** | Linked to severity |

---

## Redaction and PII

- Logs must follow existing redaction paths (`PINO_HTTP_REDACT_PATHS`, `sanitizePhase1ObservabilityFields`, `redactAuditPayloadSecrets`).
- **Never** export raw webhook bodies or full PAN/CVV to vendors.
- **Operator evidence folders** (e.g. `*_evidence/`): store **redacted** screenshots and hashes only unless counsel approves.

---

## Operator evidence folder policy

- Local or secured share; **not** a substitute for durable audit in DB.
- Naming: date + gate (e.g. `L29_2026-05-10`).
- No `.env`, no API keys, no `whsec_`, no live customer PII in plaintext files.

---

## Export before vendor deletion

- Before log vendor retention expiry, export **aggregated** metrics and **sample** redacted lines for any **open** or **recently closed** incidents (90-day lookback minimum).

---

## Compliance caveat

This document is **not** legal advice. **PCI**, **GDPR**, and **local telecom** rules may require different retention or regional data residency. **Policy pending legal/compliance review.**

---

## References

- Wallet ledger: `../WALLET_LEDGER_INVARIANT.md`
- Backup drill: `../runbooks/BACKUP_RESTORE_DRILL.md`
