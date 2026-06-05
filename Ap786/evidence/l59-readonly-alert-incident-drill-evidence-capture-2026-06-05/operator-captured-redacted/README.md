# L-59 operator dropzone

**Date:** 2026-06-05
**Gate:** L-59 read-only alert/incident drill evidence capture
**Approval phrase:** `APPROVE L-59 READ-ONLY ALERT INCIDENT DRILL EVIDENCE CAPTURE ONLY`

---

## Purpose

Manual **read-only** screenshot and attestation intake. **No live drill.** **No alert trigger.** **No incident acknowledgement click.**

---

## Required files (place in this folder)

| # | Filename | Capture rule |
|---|----------|--------------|
| 1 | `ALERT-ROUTING-READONLY-001-redacted.png` | Better Stack / equivalent alert routing view — read-only |
| 2 | `ONCALL-ESCALATION-READONLY-001-redacted.png` | On-call / escalation policy — read-only; redact PII |
| 3 | `INCIDENT-LIST-READONLY-001-redacted.png` | Incident list / page — do not create incident |
| 4 | `INCIDENT-ACK-STATE-READONLY-001-redacted.png` | Ack state if **visible without clicking**; else note **BLOCKED_READONLY** in OPERATOR-TIMESTAMP |
| 5 | `INCIDENT-RUNBOOK-READONLY-001-redacted.png` **or** `INCIDENT-RUNBOOK-READONLY-001.md` | Runbook evidence |
| 6 | `NO-MUTATION-ATTESTATION-001.md` | Attest no alert fired, no ack clicked, no mutation |
| 7 | `REDACTION-REVIEW-001.md` | Visible-content redaction review |
| 8 | `OPERATOR-TIMESTAMP-001.md` | UTC timestamp + capture notes |

---

## Forbidden during capture

- Trigger live alert
- Click acknowledge
- Edit monitors, rules, escalation, incidents
- Deploy / env / secret / payment / webhook / DB mutation
- Self-healing apply

---

## After capture

Re-run L-59 intake or successor gate to ingest staged files. Do **not** rename PNGs after staging without authorization.

---

*End of operator dropzone README.*
