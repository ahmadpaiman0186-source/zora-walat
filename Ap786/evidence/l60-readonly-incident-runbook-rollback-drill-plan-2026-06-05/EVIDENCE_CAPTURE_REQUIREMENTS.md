# L-60 — Evidence capture requirements (future L-61)

**Date:** 2026-06-05
**Dropzone:** `Ap786/evidence/l60-readonly-incident-runbook-rollback-drill-plan-2026-06-05/operator-captured-redacted/`
**L-60 status:** Requirements defined — **no capture in L-60**

---

## Required future artifacts (L-61)

| # | Artifact | Format |
|---|----------|--------|
| 1 | Runbook evidence | `RUNBOOK-READONLY-001-redacted.png` or `RUNBOOK-READONLY-001.md` |
| 2 | Severity matrix (filed) | `INCIDENT-SEVERITY-MATRIX-001.md` |
| 3 | Rollback target (read-only) | `ROLLBACK-TARGET-READONLY-001-redacted.png` |
| 4 | Rollback capability (UI visible) | `ROLLBACK-CAPABILITY-READONLY-001-redacted.png` |
| 5 | Operator approval boundary | `OPERATOR-APPROVAL-BOUNDARY-001.md` |
| 6 | No rollback / no mutation attestation | `NO-ROLLBACK-NO-MUTATION-ATTESTATION-001.md` |
| 7 | Redaction review | `REDACTION-REVIEW-001.md` |
| 8 | Operator timestamp | `OPERATOR-TIMESTAMP-001.md` |

---

## Redaction policy

Same as L-59: no secrets, tokens, env values, unredacted PII, payment identifiers, or webhook secrets in filed artifacts.

---

## Row upgrade ceiling (honest)

| L-45 row | Max upgrade from read-only L-61 capture |
|----------|----------------------------------------|
| 10 Rollback drill | **PARTIAL** (not PASS without executed drill) |
| 11 Incident runbook | **PARTIAL** (walkthrough record required) |

---

## L-59 note

L-59 dropzone (**0/8**) unchanged. L-61 uses **L-60 dropzone** for runbook/rollback-specific artifacts.

---

*End of evidence capture requirements.*
