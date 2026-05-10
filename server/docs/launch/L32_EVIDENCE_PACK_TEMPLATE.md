# L32 — Evidence pack template

**Use:** Folder per launch attempt, e.g. `L32_2026-05-10_<cohort>`. **No secrets** in any file.

---

## Pack contents checklist

- [ ] Cover sheet (date UTC, cohort phase, approvers)
- [ ] Go/no-go export (redacted)
- [ ] Deploy / release identifiers
- [ ] Readiness snapshots
- [ ] Stripe (redacted)
- [ ] Provider (redacted)
- [ ] Support summary
- [ ] Security/fraud notes
- [ ] Rollback section (if any)
- [ ] Operator signoff

---

## Redaction rules

- Mask emails to `u***@domain`; phones to last 2–4 digits.
- Never include: `whsec_`, JWT, `sk_live_`, full `DATABASE_URL`, SMTP passwords.
- Stack traces: strip file paths if customer PII embedded.

---

## Vercel / platform evidence

- Deployment id, commit SHA, **environment name** (preview vs production)
- Build log excerpt — **no** env value dump

---

## Stripe evidence

- Mode (test/live) confirmation — Dashboard header screenshot **cropped**
- Webhook endpoint id (suffix ok); delivery success rate aggregate

---

## Provider evidence

- Reloadly environment (sandbox flag name + true/false, not secret)
- Sample fulfillment success count — no full MSISDN

---

## Readiness / health evidence

- `/health` 200 screenshot or log line
- `/ready` JSON with **tokens redacted**

---

## Support evidence

- Ticket counts by type; **no** full customer threads in git

---

## Security / fraud evidence

- Aggregated counts only in shared pack; detailed forensics in secure vault

---

## Rollback evidence

- Timestamp of toggle; **names** of env vars changed, not values
- Post-recon summary hash

---

## Operator signoff section

| Role | Name | Date (UTC) | Signature / “ACK” |
|------|------|------------|---------------------|
| Engineering | | | |
| Ops | | | |
| Support | | | |
| Security | | | |

---

## Final verdict format

```
L32_LAUNCH_VERDICT: SUCCESS | ROLLBACK | ABORTED
Cohort: C0 | C1 | C2 | C3
Window (UTC): <start> – <end>
Summary: <one paragraph, no secrets>
Open follow-ups: <ticket ids>
```

---

## References

- `L25_BACKUP_RESTORE_READINESS.md` (RPO/RTO worksheet pattern)
