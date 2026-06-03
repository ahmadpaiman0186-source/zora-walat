# Redaction before commit checklist

Complete **before** placing any artifact in the operator dropzone or committing to git.

---

## Mandatory redaction categories

Verify each artifact has **none** of the following visible:

- [ ] Tokens (session, bearer, JWT, OAuth)
- [ ] Secrets and passwords
- [ ] Webhook signing secrets
- [ ] API keys and service account keys
- [ ] Auth headers (`Authorization`, `Cookie`, custom auth)
- [ ] Raw credentials and connection strings
- [ ] User PII (name, phone, address, government ID)
- [ ] Customer, order, payment, wallet identifiers (when identifiable)
- [ ] Raw logs containing sensitive values
- [ ] Internal credentials (Neon, Reloadly, etc.)
- [ ] Personal emails (unless essential for on-call proof)

---

## Per-file verification

| Filename | Redacted | Reviewer initials | Date |
|----------|----------|-------------------|------|
| BETTERSTACK-UPTIME-MONITOR-DETAILS-001-redacted.png | [ ] | | |
| BETTERSTACK-UPTIME-AVAILABILITY-TABLE-001-redacted.png | [ ] | | |
| BETTERSTACK-ALERT-ROUTING-CHANNEL-001-redacted.png | [ ] | | |
| BETTERSTACK-INCIDENT-ACKNOWLEDGEMENT-001-redacted.png | [ ] | | |
| VERCEL-PRODUCTION-DEPLOYMENT-STATUS-001-redacted.png | [ ] | | |
| VERCEL-PRODUCTION-LOGS-READONLY-QUERY-001-redacted.png | [ ] | | |
| PRODUCTION-FRONTEND-HEALTH-AVAILABILITY-001-redacted.png | [ ] | | |
| PRODUCTION-API-HEALTH-AVAILABILITY-001-redacted.png | [ ] | | |
| MONEY-PATH-OBSERVABILITY-DASHBOARD-001-redacted.png | [ ] | | |
| SRE-OPERATOR-SIGNOFF-001-redacted.* | [ ] | | |

---

## Fail criteria

| Condition | Action |
|-----------|--------|
| Any mandatory category visible | **Do not commit** — re-redact or abort |
| Uncertainty about sensitivity | **Do not commit** — redact or abort |
| Missing `-redacted` suffix on PNG | Rename or re-export |

---

## Output artifact

When complete, save a summary as:

`REDACTION-VERIFICATION-001.md`

Include: operator name/role, date, file list, PASS/FAIL per file, and explicit statement that no unredacted artifacts were committed.

**Status at L-48 filing:** Template only — not completed.

---

*End of redaction before commit checklist.*
