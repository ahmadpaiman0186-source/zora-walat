# L-58 — Evidence capture requirements (future L-59)

**Date:** 2026-06-05
**Target gate:** **L-59** — read-only alert/incident drill evidence capture
**L-58 status:** Requirements defined only — **no capture in L-58**

---

## 1. Required future artifacts

Future L-59 (or successor) must capture and file under Ap786:

| # | Artifact | Format | L-45 / plan linkage |
|---|----------|--------|---------------------|
| 1 | Alert routing screenshot | `DRILL-ALERT-ROUTING-001-redacted.png` | Row 1 |
| 2 | Escalation / on-call screenshot | `DRILL-ONCALL-ESCALATION-001-redacted.png` | Row 4 |
| 3 | Incident acknowledgement screenshot | `DRILL-INCIDENT-ACKNOWLEDGEMENT-001-redacted.png` | Row 3 |
| 4 | Incident runbook evidence | `DRILL-INCIDENT-RUNBOOK-001-redacted.png` and/or `DRILL-INCIDENT-RUNBOOK-RECORD-001-redacted.md` | Row 11 |
| 5 | No mutation attestation | `NO-MUTATION-ATTESTATION-001.md` | Session boundary |
| 6 | Redaction review | `REDACTION-REVIEW-001.md` | Filename + visible review |
| 7 | Operator timestamp | UTC timestamp in attestation MD | Audit trail |
| 8 | Conservative verdict | `CONSERVATIVE-VERDICT-001.md` | Honest row status |

Suggested dropzone: `Ap786/evidence/l59-readonly-alert-incident-drill-evidence-capture-2026-06-05/operator-captured-redacted/` (created in L-59 only).

---

## 2. Redaction requirements

| Category | Must not appear |
|----------|-----------------|
| Secrets / tokens / API keys | **FORBIDDEN** |
| Webhook secrets (`whsec_*`) | **FORBIDDEN** |
| Env values / DB URLs | **FORBIDDEN** |
| Unredacted personal phone/email | **FORBIDDEN** |
| Customer PII / payment identifiers | **FORBIDDEN** |

---

## 3. Evidence does not auto-close rows

Filing L-59 artifacts may upgrade rows to **PARTIAL** or **CAPTURED / PARTIAL** only if pass criteria met. **FULLY_PROVEN** requires all L-45 rows PASS — not L-59 alone.

---

## 4. PNG handling rule

Same as prior gates: **do not move, rename, delete, edit, regenerate, or compress** filed PNGs after capture without explicit authorization.

---

*End of evidence capture requirements.*
