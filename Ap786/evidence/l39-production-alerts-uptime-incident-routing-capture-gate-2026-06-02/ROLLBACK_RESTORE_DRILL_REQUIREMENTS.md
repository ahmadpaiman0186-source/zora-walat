# L-39 — Rollback / restore drill requirements

**Date:** 2026-06-02

---

## OBS-ROLLBACK-DRILL-001

| Field | Requirement |
|-------|-------------|
| **Scope** | **Executed** rollback or restore **drill** evidence — not UI button alone |
| **Acceptable forms** | Redacted PNG of drill record **or** signed runbook MD with timestamps (Ap786) |
| **Minimum content** | Pre/post deploy SHA, rollback action, post-rollback health check **PASS** |
| **Filename** | `OBS-ROLLBACK-DRILL-001-2026-06-02-redacted.png` (or companion MD indexed in manifest) |
| **Forbidden at L-39 gate** | Live production rollback without separate execution authorization |

---

## Pass when (future intake)

- Drill completed in controlled window; health verified; no secret leakage in screenshot.

---

## Does not prove

- Automated rollback readiness.
- RTO/RPO met for global launch.

*L-39 does not prove rollback/restore readiness.*
