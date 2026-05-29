# L38 — Compliance audit evidence request list

Checklist of **artifacts** auditors or internal compliance may request. **Do not** embed secrets or full PII in packs — reference ticket ids and redacted samples.

## Company / process evidence

- [ ] Information security policy (high level).
- [ ] Risk assessment or treatment log (annual or major change).
- [ ] Vendor management policy (Reloadly, Stripe, hosting).
- [ ] Employee security awareness acknowledgment (HR).

## Access control evidence

- [ ] RBAC matrix for production systems (GitHub, Vercel, Neon, Stripe org).
- [ ] Access review cadence (quarterly) with sample completion record.
- [ ] MFA enforcement evidence for admin consoles.

## Secrets evidence

- [ ] Secret store in use (name only); **no** secret values.
- [ ] Rotation procedure and last rotation tickets (redacted).
- [ ] CI secret scanning / pre-commit policy reference.

## Cloud / project evidence

- [ ] Environment inventory (prod/staging/dev) — names and purposes only.
- [ ] Network diagram or narrative (edge → app → DB).
- [ ] Backup configuration references (job names, RPO/RTO targets).

## Payment evidence

- [ ] Stripe integration description (webhook URL pattern, signing).
- [ ] PCI SAQ scoping statement (org-specific; typically Stripe-hosted fields reduce scope — confirm with QSA/Finance).
- [ ] Refund/dispute process reference (`PHASE1_REFUND_AND_DISPUTE.md`).

## Provider evidence

- [ ] Reloadly usage summary (sandbox vs live separation).
- [ ] Operator mapping governance (who approves catalog changes).

## Incident response evidence

- [ ] Incident playbook link (`PHASE1_INCIDENT_PLAYBOOK.md`).
- [ ] Sample tabletop or post-incident review (redacted).

## Backup / restore evidence

- [ ] Backup job existence and last successful run (timestamp).
- [ ] Restore drill record (`runbooks/BACKUP_RESTORE_DRILL.md` when executed).

## Logging / monitoring evidence

- [ ] Log retention policy reference.
- [ ] Security-relevant alerts list (auth spikes, webhook failures) — names only.

## Privacy / data evidence

- [ ] Privacy policy URL and last review date.
- [ ] Data retention schedule by data class.
- [ ] DSAR process owner and SLA.

## Support / recovery evidence

- [ ] Manual recovery authority description (who can trigger refunds, freeze checkout).
- [ ] Support access to production data — justification and logging.

## Change management evidence

- [ ] PR review requirements for money-path changes.
- [ ] Deployment approval for production (who merges/releases).

## Retention / redaction rules

- Evidence packs: **90 days** default post-audit unless legal holds (adjust per counsel).
- Redact: secrets, full PAN/CVV, live webhook signing secrets, full phone numbers.
- OK: last-4, order id suffixes, timestamps, severity, ticket ids.

## Related

- [L38_SECURITY_CONTROL_EVIDENCE_MATRIX.md](./L38_SECURITY_CONTROL_EVIDENCE_MATRIX.md)
