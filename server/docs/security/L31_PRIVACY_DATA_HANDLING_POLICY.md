# L31 — Privacy and data handling policy (engineering draft)

**Status:** Operational draft for engineering, support, and security. **Not** a published privacy notice. **Pending** legal/privacy team review.

---

## Data categories

| Category | Examples | Typical storage |
|----------|----------|-----------------|
| **Account** | Email, phone, user id | Application DB |
| **Transaction** | Order id, amounts, status, Stripe ids (references) | DB + Stripe |
| **Payment instrument** | Card brand/last4 via Stripe — **not** full PAN in app | Stripe primarily |
| **Fulfillment** | MSISDN / recipient for top-up | DB, provider |
| **Telemetry** | Logs, trace ids, IPs | Log vendor |
| **Staff actions** | Admin mutations | Audit tables |

---

## PII handling

- Minimize collection; use **suffix** or hash display in dashboards where possible.
- Support tickets: follow L30 redaction rules; no full phone in public channels.
- Do not export production PII to personal devices without policy.

---

## Payment data handling

- **Stripe** is the card data boundary; the API must not persist PAN/CVV.
- Use Dashboard for charge lookups; do not screenshot full card numbers.

---

## Stripe data boundary

- Webhook bodies may contain sensitive references — **redact** in exports.
- API keys and webhook signing secrets are **never** data subjects’ data — they are operator secrets.

---

## Provider / Reloadly data boundary

- MSISDN and top-up metadata flow to Reloadly per fulfillment; subject to **provider DPA** (operator-managed).
- Sandbox data must not mix with production PII exports.

---

## Support evidence redaction

- Align with [`../support/L30_SUPPORT_TICKET_TAXONOMY.md`](../support/L30_SUPPORT_TICKET_TAXONOMY.md) and L30 templates.
- Attachments: encrypt or use secure ticket vault per org policy.

---

## Logs and audit data handling

- Structured JSON logs; redaction paths in production logging config.
- Retention: align with `server/docs/observability/L29_LOG_AUDIT_RETENTION_POLICY.md` when that document is present on your branch (e.g. after L29 docs merge); otherwise use organizational default.

---

## User deletion / export caveat

If the product **does not** yet implement self-service data export or erasure:

- Document requests manually; legal determines scope (financial records may be retained).
- Do not promise “instant deletion” in support templates.

---

## Legal / compliance review caveat

This document is **not** legal advice. GDPR, CCPA, telecom rules, and **PCI** obligations depend on deployment geography and acquirer — require **legal/compliance review** before external publication or contractual commitment.

---

## References

- [`L31_SECRETS_ACCESS_CONTROL_RUNBOOK.md`](./L31_SECRETS_ACCESS_CONTROL_RUNBOOK.md)  
- [`../TRUST_API_CONTRACT.md`](../TRUST_API_CONTRACT.md)
