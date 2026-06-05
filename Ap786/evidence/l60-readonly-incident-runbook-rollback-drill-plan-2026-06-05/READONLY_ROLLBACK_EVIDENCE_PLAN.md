# L-60 — Read-only rollback evidence plan

**Date:** 2026-06-05
**Target gate:** **L-61** evidence capture (not executed in L-60)

---

## 1. Objective

Document how a **future approved** operator session would capture read-only rollback **readiness** evidence without performing rollback.

---

## 2. Planned capture sequence (L-61)

| Step | Capture | Abort if |
|------|---------|----------|
| 1 | Vercel prod deployment list (read-only) | UI prompts deploy action |
| 2 | Highlight current + candidate prior deployment | Secret/PII visible |
| 3 | Screenshot rollback control visible (not clicked) | Accidental click |
| 4 | File attestation: no rollback performed | Any rollback initiated |

---

## 3. Evidence artifacts

| Artifact | Filename |
|----------|----------|
| Rollback target identification | `ROLLBACK-TARGET-READONLY-001-redacted.png` |
| Rollback capability (UI visible) | `ROLLBACK-CAPABILITY-READONLY-001-redacted.png` |
| No rollback attestation | `NO-ROLLBACK-NO-MUTATION-ATTESTATION-001.md` |

---

## 4. Pass criteria (future L-61)

| Criterion | Required |
|-----------|----------|
| Prod project visible | **YES** |
| Deployment SHA/history visible | **YES** |
| Rollback control visible (not used) | **YES** |
| No rollback executed | **YES** |
| Redaction PASS | **YES** |

Maximum honest upgrade: **PARTIAL** — not L-45 row 10 PASS (requires executed drill + post-health PASS per L-45 matrix).

---

## 5. Conservative position

| Claim | After L-60 plan? |
|-------|------------------|
| Rollback plan filed | **YES** |
| Rollback proof | **NO** |
| Rollback drill executed | **NO** |

---

*End of read-only rollback evidence plan.*
